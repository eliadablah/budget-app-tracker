# bootstrap/main.tf
# What: creates the S3 bucket that will store Terraform's state for the main stack.
# Why: Terraform keeps a "memory" (the state file) of everything it built. That file can
#      contain sensitive values, so it lives in a private, versioned, encrypted bucket
#      instead of on your laptop or in Git.
#
# Chicken-and-egg note: this stack itself uses LOCAL state, because the bucket does not
# exist yet. That is fine. The local state file is git-ignored and easy to recreate.

# Who am I? Used to make the bucket name globally unique without hardcoding an account ID.
data "aws_caller_identity" "current" {}

locals {
  state_bucket_name = "${var.project_name}-tfstate-${data.aws_caller_identity.current.account_id}"
}

# --- The bucket ---
resource "aws_s3_bucket" "tfstate" {
  bucket = local.state_bucket_name

  # Safety net: `terraform destroy` will refuse to delete the bucket holding your state.
  lifecycle {
    prevent_destroy = true
  }
}

# --- Versioning: keeps old copies of the state file so a bad write can be rolled back ---
resource "aws_s3_bucket_versioning" "tfstate" {
  bucket = aws_s3_bucket.tfstate.id

  versioning_configuration {
    status = "Enabled"
  }
}

# --- Encryption at rest ---
resource "aws_s3_bucket_server_side_encryption_configuration" "tfstate" {
  bucket = aws_s3_bucket.tfstate.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# --- Block every form of public access ---
resource "aws_s3_bucket_public_access_block" "tfstate" {
  bucket = aws_s3_bucket.tfstate.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
