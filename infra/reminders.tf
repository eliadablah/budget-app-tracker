# infra/reminders.tf
# What: everything that sends to-do reminder emails on a schedule.
#   1. A second Lambda, from the SAME Docker image as the API, but started at
#      a different function (reminders/sendDueReminders.handler).
#   2. Its own IAM role - it can read due reminders and send email from our
#      domain, nothing else.
#   3. An EventBridge Scheduler schedule that wakes it every 15 minutes.
#   4. An alarm that emails the alert address if a run fails.
#
# The schedule stays DISABLED until reminder_email is set AND
# reminder_schedule_enabled is true, so nothing runs before the code and
# the email domain are both ready.

locals {
  reminders_name = "${var.project_name}-${var.environment}-reminders"
  email_ready    = var.reminder_email != ""
}

resource "aws_cloudwatch_log_group" "reminders" {
  name              = "/aws/lambda/${local.reminders_name}"
  retention_in_days = 14

  tags = {
    Project     = var.project_name
    ManagedBy   = "terraform"
    Stack       = "infra"
    Environment = var.environment
  }
}

# --- 2. Role: what the sender may do ---
# Reuses the same "Lambda may wear this role" trust policy as iam.tf.
resource "aws_iam_role" "reminders" {
  name               = "${local.reminders_name}-exec"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json

  tags = {
    Project     = var.project_name
    ManagedBy   = "terraform"
    Stack       = "infra"
    Environment = var.environment
  }
}

data "aws_iam_policy_document" "reminders" {
  statement {
    sid       = "FindDueReminders"
    effect    = "Allow"
    actions   = ["dynamodb:Query"]
    resources = ["${aws_dynamodb_table.app.arn}/index/reminders-due"]
  }

  # GetItem reads settings; UpdateItem claims reminders and counts texts.
  statement {
    sid       = "ClaimRemindersAndReadSettings"
    effect    = "Allow"
    actions   = ["dynamodb:GetItem", "dynamodb:UpdateItem"]
    resources = [aws_dynamodb_table.app.arn]
  }

  # Send only from our own domain. While the account is in the SES sandbox,
  # SES also checks permission on the RECIPIENT's verified identity, so that
  # one address is listed too - and nothing else.
  dynamic "statement" {
    for_each = local.email_ready ? [1] : []
    content {
      sid     = "SendReminderEmailOnly"
      effect  = "Allow"
      actions = ["ses:SendEmail"]
      resources = [
        aws_sesv2_email_identity.domain.arn,
        "arn:aws:ses:${var.aws_region}:${data.aws_caller_identity.current.account_id}:identity/${var.reminder_email}",
      ]
    }
  }
}

resource "aws_iam_role_policy" "reminders" {
  name   = local.reminders_name
  role   = aws_iam_role.reminders.id
  policy = data.aws_iam_policy_document.reminders.json
}

resource "aws_iam_role_policy_attachment" "reminders_logs" {
  role       = aws_iam_role.reminders.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# --- 1. The sender Lambda ---
resource "aws_lambda_function" "reminders" {
  function_name = local.reminders_name
  role          = aws_iam_role.reminders.arn

  package_type = "Image"
  image_uri    = "${aws_ecr_repository.backend.repository_url}:latest"

  # Same image as the API; this line picks a different starting function.
  image_config {
    command = ["reminders/sendDueReminders.handler"]
  }

  memory_size = 256
  timeout     = 60

  environment {
    variables = {
      TABLE_NAME     = aws_dynamodb_table.app.name
      REMINDER_EMAIL = var.reminder_email
      REMINDER_FROM  = local.reminder_from
      TIME_ZONE      = var.reminder_time_zone
      # Link at the bottom of each email, back to the to-do list.
      APP_URL = "https://${var.frontend_domain_name}"
    }
  }

  depends_on = [aws_cloudwatch_log_group.reminders]

  tags = {
    Project     = var.project_name
    ManagedBy   = "terraform"
    Stack       = "infra"
    Environment = var.environment
  }
}

# --- 3. The 15-minute schedule ---
data "aws_iam_policy_document" "scheduler_assume_role" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["scheduler.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "reminders_scheduler" {
  name               = "${local.reminders_name}-scheduler"
  assume_role_policy = data.aws_iam_policy_document.scheduler_assume_role.json

  tags = {
    Project     = var.project_name
    ManagedBy   = "terraform"
    Stack       = "infra"
    Environment = var.environment
  }
}

data "aws_iam_policy_document" "reminders_scheduler" {
  statement {
    effect    = "Allow"
    actions   = ["lambda:InvokeFunction"]
    resources = [aws_lambda_function.reminders.arn]
  }
}

resource "aws_iam_role_policy" "reminders_scheduler" {
  name   = "${local.reminders_name}-scheduler"
  role   = aws_iam_role.reminders_scheduler.id
  policy = data.aws_iam_policy_document.reminders_scheduler.json
}

resource "aws_scheduler_schedule" "reminders" {
  name                = local.reminders_name
  schedule_expression = "rate(15 minutes)"
  # Two keys needed to turn it on: an inbox to send to, AND the explicit
  # switch (see reminder_schedule_enabled for why).
  state = local.email_ready && var.reminder_schedule_enabled ? "ENABLED" : "DISABLED"

  flexible_time_window {
    mode = "OFF"
  }

  target {
    arn      = aws_lambda_function.reminders.arn
    role_arn = aws_iam_role.reminders_scheduler.arn

    # No automatic retries: a retried run could send a text twice. The next
    # run 15 minutes later picks up anything that was missed.
    retry_policy {
      maximum_retry_attempts = 0
    }
  }
}

# --- 4. Alarm: a run failed ---
resource "aws_cloudwatch_metric_alarm" "reminders_errors" {
  alarm_name          = "${local.reminders_name}-errors"
  alarm_description   = "The reminder sender failed. Check its logs in CloudWatch."
  namespace           = "AWS/Lambda"
  metric_name         = "Errors"
  dimensions          = { FunctionName = aws_lambda_function.reminders.function_name }
  statistic           = "Sum"
  period              = 900
  evaluation_periods  = 1
  threshold           = 1
  comparison_operator = "GreaterThanOrEqualToThreshold"
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  ok_actions          = [aws_sns_topic.alerts.arn]
}
