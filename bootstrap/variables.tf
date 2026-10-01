# bootstrap/variables.tf
# What: the few knobs for this stack. Defaults are fine for a personal project.

variable "aws_region" {
  description = "AWS region where the state bucket is created."
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Short name used in the bucket name and resource tags."
  type        = string
  default     = "budget-app"
}
