# infra/iam.tf
# What: the IAM role the Lambda function will run as, and exactly what that
#       role is allowed to do. Nothing else in this stack can touch
#       DynamoDB directly - only whatever assumes this role can.
#
# Why its own file: mirrors dynamodb.tf / versions.tf - one AWS "topic" per
#       file, so the right code is easy to find by filename alone.

# --- Trust policy: who is allowed to "wear" this role ---
# A data source (not a resource) - it doesn't create anything in AWS, it just
# builds a validated JSON document. Using aws_iam_policy_document instead of
# hand-typed JSON is the standard convention: Terraform catches structural
# mistakes immediately instead of only at apply time.
data "aws_iam_policy_document" "lambda_assume_role" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "lambda_exec" {
  name               = "${var.project_name}-${var.environment}-lambda-exec"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json

  tags = {
    Project     = var.project_name
    ManagedBy   = "terraform"
    Stack       = "infra"
    Environment = var.environment
  }
}

# --- Permissions policy: what the role can do once it's assumed ---
# Scoped to exactly 5 actions, and only this one table's ARN - not
# "all DynamoDB tables," not "all resources."
data "aws_iam_policy_document" "lambda_dynamodb_access" {
  statement {
    effect = "Allow"
    actions = [
      "dynamodb:GetItem",
      "dynamodb:PutItem",
      "dynamodb:UpdateItem",
      "dynamodb:DeleteItem",
      "dynamodb:Query",
    ]
    resources = [aws_dynamodb_table.app.arn]
  }

  # The Notifications card lists the next reminders by reading the same
  # index the sender uses. An index has its own ARN, separate from the table.
  statement {
    sid       = "ReadUpcomingReminders"
    effect    = "Allow"
    actions   = ["dynamodb:Query"]
    resources = ["${aws_dynamodb_table.app.arn}/index/reminders-due"]
  }
}

# --- Email: the API may send the "test email" from the Notifications card ---
# Same narrow permission as the reminders Lambda: from our domain, to the one
# verified inbox. Nothing is granted while reminder_email is empty.
data "aws_iam_policy_document" "lambda_send_email" {
  count = local.email_ready ? 1 : 0

  statement {
    sid     = "SendTestEmailOnly"
    effect  = "Allow"
    actions = ["ses:SendEmail"]
    resources = [
      local.email_domain_arn,
      "arn:aws:ses:${var.aws_region}:${data.aws_caller_identity.current.account_id}:identity/${var.reminder_email}",
    ]
  }
}

resource "aws_iam_role_policy" "lambda_send_email" {
  count  = local.email_ready ? 1 : 0
  name   = "${var.project_name}-${var.environment}-lambda-send-email"
  role   = aws_iam_role.lambda_exec.id
  policy = data.aws_iam_policy_document.lambda_send_email[0].json
}

resource "aws_iam_role_policy" "lambda_dynamodb_access" {
  name   = "${var.project_name}-${var.environment}-lambda-dynamodb-access"
  role   = aws_iam_role.lambda_exec.id
  policy = data.aws_iam_policy_document.lambda_dynamodb_access.json
}

# --- Plaid secrets: what the role may touch in Parameter Store ---
# Two statements, on purpose:
#   1. The two Plaid API keys - READ only. The Lambda can use them but can
#      never change or delete them.
#   2. The per-bank access tokens under items/ - read, write, delete, since
#      the Lambda creates one when a bank is connected and removes it when
#      the bank is disconnected.
# Nothing outside this project's plaid folder is reachable.
locals {
  plaid_param_arn = "arn:aws:ssm:${var.aws_region}:${data.aws_caller_identity.current.account_id}:parameter${local.plaid_param_prefix}"
}

data "aws_iam_policy_document" "lambda_plaid_secrets" {
  statement {
    sid     = "ReadPlaidApiKeys"
    effect  = "Allow"
    actions = ["ssm:GetParameter"]
    resources = [
      "${local.plaid_param_arn}/client-id",
      "${local.plaid_param_arn}/secret",
    ]
  }

  statement {
    sid    = "ManageBankTokens"
    effect = "Allow"
    actions = [
      "ssm:GetParameter",
      "ssm:PutParameter",
      "ssm:DeleteParameter",
    ]
    resources = ["${local.plaid_param_arn}/items/*"]
  }
}

resource "aws_iam_role_policy" "lambda_plaid_secrets" {
  name   = "${var.project_name}-${var.environment}-lambda-plaid-secrets"
  role   = aws_iam_role.lambda_exec.id
  policy = data.aws_iam_policy_document.lambda_plaid_secrets.json
}

# --- Logging permission: lets the Lambda report what it's doing ---
# AWS's own pre-built, battle-tested policy for this - every Lambda needs it
# just to write to CloudWatch Logs. No reason to hand-write this one.
resource "aws_iam_role_policy_attachment" "lambda_basic_execution" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}
