# infra/dynamodb.tf
# What: the one DynamoDB table that stores both to-do items and budget entries.
#
# Why a single table: DynamoDB apps conventionally use "single-table design" -
#      one table holding several kinds of items, told apart by their key
#      values instead of living in separate tables. It keeps IAM permissions,
#      backups, and cost (DynamoDB bills per request, not per table) simpler.
#
# How the keys work (plain terms):
#   pk (partition key) = "who/what owns this item", e.g. "USER#me"
#   sk (sort key)      = "what this item is", e.g. "TODO#2026-10-01#abc123"
#                         or "BUDGET#2026-10#groceries"
# Asking DynamoDB for "all of USER#me's to-dos" becomes one cheap, fast query
# on pk with an sk prefix, instead of scanning the whole table.

resource "aws_dynamodb_table" "app" {
  name = "${var.project_name}-${var.environment}"

  # On-demand billing: you pay only for requests actually made, nothing while
  # idle. Right fit for a personal app with occasional traffic.
  billing_mode = "PAY_PER_REQUEST"

  hash_key  = "pk"
  range_key = "sk"

  attribute {
    name = "pk"
    type = "S"
  }

  attribute {
    name = "sk"
    type = "S"
  }

  # Lets you restore the table to any second within the last 35 days -
  # cheap insurance against an accidental delete.
  point_in_time_recovery {
    enabled = true
  }

  tags = {
    Project     = var.project_name
    ManagedBy   = "terraform"
    Stack       = "infra"
    Environment = var.environment
  }
}
