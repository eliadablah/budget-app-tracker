# infra/lambda.tf
# What: the actual Lambda function - the "robot" that runs your backend code
#       whenever a request comes in. Wears the IAM role from iam.tf, runs the
#       Docker image pushed to the ECR repo from ecr.tf.

# Parameter Store folder for everything Plaid-related. The two API keys
# (client-id, secret) are put there by hand with `aws ssm put-parameter`;
# the Lambda adds one entry per connected bank under items/.
locals {
  plaid_param_prefix = "/${var.project_name}/${var.environment}/plaid"
}

# An explicit log group, with a retention policy set on purpose. If this is
# skipped, AWS auto-creates one the first time the function runs - but with
# "never expire" retention, which quietly costs more forever and isn't
# tracked by Terraform at all. Declaring it here keeps it in your control.
resource "aws_cloudwatch_log_group" "backend" {
  name              = "/aws/lambda/${var.project_name}-${var.environment}"
  retention_in_days = 14 # enough to debug recent issues without keeping logs forever

  tags = {
    Project     = var.project_name
    ManagedBy   = "terraform"
    Stack       = "infra"
    Environment = var.environment
  }
}

resource "aws_lambda_function" "backend" {
  function_name = "${var.project_name}-${var.environment}"
  role          = aws_iam_role.lambda_exec.arn

  package_type = "Image"
  image_uri    = "${aws_ecr_repository.backend.repository_url}:latest"

  memory_size = 256
  # 20s (was 10): listing bank accounts waits on Plaid for every connected
  # bank, which is slower than a plain DynamoDB read.
  timeout = 20

  environment {
    variables = {
      TABLE_NAME = aws_dynamodb_table.app.name
      # "sandbox" = Plaid's fake banks, "production" = real ones.
      PLAID_ENV = var.plaid_env
      # Where the Plaid keys and bank tokens live in Parameter Store. Only
      # the LOCATION is here - the values themselves never pass through
      # Terraform, so they never end up in its state file.
      PLAID_PARAM_PREFIX = local.plaid_param_prefix
    }
  }

  # Make sure our log group (with its 14-day retention) exists before the
  # function does, so AWS never gets a chance to auto-create its own
  # "never expire" one first.
  depends_on = [aws_cloudwatch_log_group.backend]

  tags = {
    Project     = var.project_name
    ManagedBy   = "terraform"
    Stack       = "infra"
    Environment = var.environment
  }
}
