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

variable "reminder_email" {
  description = "Inbox that to-do reminder emails go to. Must be verified in SES while the account is in the SES sandbox. Leave empty to keep email reminders (and their schedule) off. Set it in terraform.tfvars."
  type        = string
  default     = ""
}

variable "reminder_schedule_enabled" {
  description = "Turns on the 15-minute reminder schedule. Keep false until the reminder code has been deployed (a push to main) and SES shows the email domain as verified - otherwise every run fails and trips the alarm."
  type        = bool
  default     = false
}

variable "email_domain" {
  description = "Domain reminder emails are sent from (reminders@<this>). Must be a Route 53 hosted zone in this account, so the DKIM records can be added automatically."
  type        = string
  default     = "eliadablah.com"
}

variable "reminder_time_zone" {
  description = "Time zone used to write times inside reminder texts."
  type        = string
  default     = "America/Chicago"
}
