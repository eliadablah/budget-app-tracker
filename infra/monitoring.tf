# infra/monitoring.tf
# What: tells you when the app breaks, instead of you finding out by
#       opening the site. Three pieces:
#   1. A notification channel (SNS topic) that emails you
#   2. Alarms that watch specific numbers and trip the channel
#   3. A dashboard - one page of graphs showing the app's health
#
# Cost note: AWS's always-free allowance covers 10 alarms, 3 dashboards and
# 10 custom metrics. This file uses 6 alarms, 1 dashboard, 2 custom metrics.

variable "alert_email" {
  description = "Email address that receives alarm notifications. Leave empty to create the alarms without emailing anyone. Set it in terraform.tfvars (gitignored) so it stays out of the repo."
  type        = string
  default     = ""
}

locals {
  monitoring_name = "${var.project_name}-${var.environment}"

  # Namespace for the app's own metrics (the ones counted from log lines
  # below), kept apart from AWS's built-in "AWS/..." namespaces.
  custom_metric_namespace = "BudgetApp/${var.environment}"

  monitoring_tags = {
    Project     = var.project_name
    ManagedBy   = "terraform"
    Stack       = "infra"
    Environment = var.environment
  }
}

# --- 1. Notification channel ---

resource "aws_sns_topic" "alerts" {
  name = "${local.monitoring_name}-alerts"
  tags = local.monitoring_tags
}

# AWS sends a "confirm subscription" email first - nothing is delivered
# until the link in it is clicked. count = 0 when no address is set, so the
# rest of this file still works without one.
resource "aws_sns_topic_subscription" "alerts_email" {
  count = var.alert_email == "" ? 0 : 1

  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email
}

# --- 2a. Custom metrics, counted from the backend's own log lines ---
# The backend catches its errors and replies with a tidy 500/502 rather
# than crashing, so AWS's built-in "Lambda errors" number stays at zero
# even when things go wrong. These filters count the log lines handler.ts
# writes in those cases, turning them into numbers an alarm can watch.

resource "aws_cloudwatch_log_metric_filter" "unhandled_errors" {
  name           = "${local.monitoring_name}-unhandled-errors"
  log_group_name = aws_cloudwatch_log_group.backend.name
  pattern        = "\"Unhandled error\""

  metric_transformation {
    name      = "UnhandledErrors"
    namespace = local.custom_metric_namespace
    value     = "1"
    unit      = "Count"
  }
}

resource "aws_cloudwatch_log_metric_filter" "plaid_errors" {
  name           = "${local.monitoring_name}-plaid-errors"
  log_group_name = aws_cloudwatch_log_group.backend.name
  pattern        = "\"Plaid error\""

  metric_transformation {
    name      = "PlaidErrors"
    namespace = local.custom_metric_namespace
    value     = "1"
    unit      = "Count"
  }
}

# --- 2b. Alarms ---
# Shared settings, explained once:
#   period 300 + evaluation_periods 1 = "look at the last 5 minutes"
#   treat_missing_data notBreaching   = no traffic means no data, which is
#                                       normal for a personal app, not a
#                                       problem
#   ok_actions                        = also email when it recovers

resource "aws_cloudwatch_metric_alarm" "backend_unhandled_errors" {
  alarm_name        = "${local.monitoring_name}-backend-unhandled-errors"
  alarm_description = "The backend hit an error it didn't expect and replied 500. Check the Lambda logs for 'Unhandled error'."

  namespace           = local.custom_metric_namespace
  metric_name         = aws_cloudwatch_log_metric_filter.unhandled_errors.metric_transformation[0].name
  statistic           = "Sum"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  threshold           = 1
  period              = 300
  evaluation_periods  = 1
  treat_missing_data  = "notBreaching"

  alarm_actions = [aws_sns_topic.alerts.arn]
  ok_actions    = [aws_sns_topic.alerts.arn]
  tags          = local.monitoring_tags
}

# A higher bar than the others: a single Plaid hiccup is routine, several
# in five minutes usually means bad keys or a bank needing to be reconnected.
resource "aws_cloudwatch_metric_alarm" "plaid_errors" {
  alarm_name        = "${local.monitoring_name}-plaid-errors"
  alarm_description = "Plaid refused several requests. Check the Lambda logs for 'Plaid error' and its error code."

  namespace           = local.custom_metric_namespace
  metric_name         = aws_cloudwatch_log_metric_filter.plaid_errors.metric_transformation[0].name
  statistic           = "Sum"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  threshold           = 3
  period              = 300
  evaluation_periods  = 1
  treat_missing_data  = "notBreaching"

  alarm_actions = [aws_sns_topic.alerts.arn]
  ok_actions    = [aws_sns_topic.alerts.arn]
  tags          = local.monitoring_tags
}

# Crashes and timeouts - the failures the backend could NOT catch itself.
resource "aws_cloudwatch_metric_alarm" "lambda_errors" {
  alarm_name        = "${local.monitoring_name}-lambda-crashes"
  alarm_description = "The Lambda crashed or timed out (a failure the code didn't catch)."

  namespace           = "AWS/Lambda"
  metric_name         = "Errors"
  dimensions          = { FunctionName = aws_lambda_function.backend.function_name }
  statistic           = "Sum"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  threshold           = 1
  period              = 300
  evaluation_periods  = 1
  treat_missing_data  = "notBreaching"

  alarm_actions = [aws_sns_topic.alerts.arn]
  ok_actions    = [aws_sns_topic.alerts.arn]
  tags          = local.monitoring_tags
}

# Throttled = AWS refused to run the function because too many copies were
# already running. Should never happen for one user; if it does, something
# is calling the API in a loop.
resource "aws_cloudwatch_metric_alarm" "lambda_throttles" {
  alarm_name        = "${local.monitoring_name}-lambda-throttles"
  alarm_description = "AWS refused to run the Lambda because too many were already running."

  namespace           = "AWS/Lambda"
  metric_name         = "Throttles"
  dimensions          = { FunctionName = aws_lambda_function.backend.function_name }
  statistic           = "Sum"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  threshold           = 1
  period              = 300
  evaluation_periods  = 1
  treat_missing_data  = "notBreaching"

  alarm_actions = [aws_sns_topic.alerts.arn]
  ok_actions    = [aws_sns_topic.alerts.arn]
  tags          = local.monitoring_tags
}

# An early warning before requests start timing out: trips when the slowest
# requests take over 75% of the function's time limit. p95 = "95% of
# requests were faster than this", which ignores a single freak slow one.
# Needs two bad 5-minute windows in a row, so one slow bank doesn't page you.
resource "aws_cloudwatch_metric_alarm" "lambda_slow" {
  alarm_name        = "${local.monitoring_name}-lambda-slow"
  alarm_description = "Backend requests are taking over 75% of the Lambda's time limit - timeouts are close."

  namespace           = "AWS/Lambda"
  metric_name         = "Duration"
  dimensions          = { FunctionName = aws_lambda_function.backend.function_name }
  extended_statistic  = "p95"
  comparison_operator = "GreaterThanThreshold"
  threshold           = aws_lambda_function.backend.timeout * 1000 * 0.75 # milliseconds
  period              = 300
  evaluation_periods  = 2
  treat_missing_data  = "notBreaching"

  alarm_actions = [aws_sns_topic.alerts.arn]
  ok_actions    = [aws_sns_topic.alerts.arn]
  tags          = local.monitoring_tags
}

# What visitors actually experienced: any reply in the 500s from the API.
resource "aws_cloudwatch_metric_alarm" "api_5xx" {
  alarm_name        = "${local.monitoring_name}-api-5xx"
  alarm_description = "The API returned server errors (5xx) to the browser."

  namespace           = "AWS/ApiGateway"
  metric_name         = "5xx"
  dimensions          = { ApiId = aws_apigatewayv2_api.backend.id }
  statistic           = "Sum"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  threshold           = 3
  period              = 300
  evaluation_periods  = 1
  treat_missing_data  = "notBreaching"

  alarm_actions = [aws_sns_topic.alerts.arn]
  ok_actions    = [aws_sns_topic.alerts.arn]
  tags          = local.monitoring_tags
}

# --- 3. Dashboard ---
# One page of graphs. The layout is a 24-column grid: x/y place a widget,
# width/height size it. Each "metrics" row is [namespace, metric,
# dimension name, dimension value].

resource "aws_cloudwatch_dashboard" "app" {
  dashboard_name = local.monitoring_name

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "alarm"
        x      = 0
        y      = 0
        width  = 24
        height = 3
        properties = {
          title = "Alarms"
          alarms = [
            aws_cloudwatch_metric_alarm.backend_unhandled_errors.arn,
            aws_cloudwatch_metric_alarm.plaid_errors.arn,
            aws_cloudwatch_metric_alarm.lambda_errors.arn,
            aws_cloudwatch_metric_alarm.lambda_throttles.arn,
            aws_cloudwatch_metric_alarm.lambda_slow.arn,
            aws_cloudwatch_metric_alarm.api_5xx.arn,
          ]
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 3
        width  = 12
        height = 6
        properties = {
          title  = "API requests and errors"
          region = var.aws_region
          stat   = "Sum"
          period = 300
          metrics = [
            ["AWS/ApiGateway", "Count", "ApiId", aws_apigatewayv2_api.backend.id],
            ["AWS/ApiGateway", "4xx", "ApiId", aws_apigatewayv2_api.backend.id],
            ["AWS/ApiGateway", "5xx", "ApiId", aws_apigatewayv2_api.backend.id],
          ]
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 3
        width  = 12
        height = 6
        properties = {
          title  = "Backend errors (from logs)"
          region = var.aws_region
          stat   = "Sum"
          period = 300
          metrics = [
            [local.custom_metric_namespace, "UnhandledErrors"],
            [local.custom_metric_namespace, "PlaidErrors"],
            ["AWS/Lambda", "Errors", "FunctionName", aws_lambda_function.backend.function_name],
          ]
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 9
        width  = 12
        height = 6
        properties = {
          title  = "Backend speed (milliseconds)"
          region = var.aws_region
          period = 300
          metrics = [
            ["AWS/Lambda", "Duration", "FunctionName", aws_lambda_function.backend.function_name, { stat = "p50", label = "Typical (p50)" }],
            ["AWS/Lambda", "Duration", "FunctionName", aws_lambda_function.backend.function_name, { stat = "p95", label = "Slowest 5% (p95)" }],
          ]
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 9
        width  = 12
        height = 6
        properties = {
          title  = "Database reads and writes"
          region = var.aws_region
          stat   = "Sum"
          period = 300
          metrics = [
            ["AWS/DynamoDB", "ConsumedReadCapacityUnits", "TableName", aws_dynamodb_table.app.name],
            ["AWS/DynamoDB", "ConsumedWriteCapacityUnits", "TableName", aws_dynamodb_table.app.name],
          ]
        }
      },
    ]
  })
}
