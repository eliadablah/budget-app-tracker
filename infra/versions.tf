# infra/versions.tf
# What: pins Terraform and provider versions, and tells Terraform where to store
#       THIS stack's state.
# Why remote state now: bootstrap/ used local state because the S3 bucket didn't
#      exist yet. Now it does, so this stack (and everything after it) stores its
#      state in that bucket instead of a local file on your laptop.

terraform {
  required_version = ">= 1.10.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }

  # NOTE: backend blocks cannot use variables or data sources - the values here
  # must be literal. This bucket name is bootstrap's `state_bucket_name` output.
  # use_lockfile uses S3 itself to prevent two "terraform apply" runs from
  # colliding, so we don't need a separate DynamoDB table just for locking.
  backend "s3" {
    bucket       = "budget-app-tfstate-277820847315"
    key          = "infra/terraform.tfstate"
    region       = "us-east-1"
    encrypt      = true
    use_lockfile = true
  }
}

provider "aws" {
  region = var.aws_region
}
