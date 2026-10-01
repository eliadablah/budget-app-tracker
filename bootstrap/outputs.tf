# bootstrap/outputs.tf
# What: values printed after `terraform apply`. You'll paste the bucket name into the
#       main stack's backend configuration in the next step.

output "state_bucket_name" {
  description = "Name of the S3 bucket that stores Terraform state."
  value       = aws_s3_bucket.tfstate.id
}

output "aws_region" {
  description = "Region the bucket lives in."
  value       = var.aws_region
}
