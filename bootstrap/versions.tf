# bootstrap/versions.tf
# What: pins the Terraform and AWS provider versions, and configures the AWS provider.
# Why: pinned versions mean the same code behaves the same next month, on any machine.
#
# Credentials are NOT set here. Terraform picks them up from your AWS CLI setup
# (set the AWS_PROFILE environment variable if you use a named profile).

terraform {
  # S3 native state locking (used in the main stack later) needs Terraform 1.10 or newer.
  required_version = ">= 1.10"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }
}

provider "aws" {
  region = var.aws_region

  # Every resource gets these tags automatically, which makes cost tracking easier later.
  default_tags {
    tags = {
      Project   = var.project_name
      ManagedBy = "terraform"
      Stack     = "bootstrap"
    }
  }
}
