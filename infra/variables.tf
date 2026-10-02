# infra/variables.tf
# What: the few knobs for the main stack. Names mirror bootstrap/variables.tf
#       so the two stacks stay consistent.

variable "aws_region" {
  description = "AWS region where resources are created."
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Short name used in resource names and tags."
  type        = string
  default     = "budget-app"
}

variable "environment" {
  description = "Environment name (e.g. dev, prod). Used in resource naming and tags."
  type        = string
  default     = "dev"
}

variable "plaid_env" {
  description = "Which Plaid environment the backend talks to: sandbox (fake banks) or production (real banks)."
  type        = string
  default     = "sandbox"

  validation {
    condition     = contains(["sandbox", "production"], var.plaid_env)
    error_message = "plaid_env must be \"sandbox\" or \"production\"."
  }
}

variable "frontend_domain_name" {
  description = "Custom domain the frontend is served from, as a subdomain of an existing Route 53 hosted zone."
  type        = string
  default     = "budgettracker.eliadablah.com"
}
