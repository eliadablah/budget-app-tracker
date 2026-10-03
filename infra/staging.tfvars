# infra/staging.tfvars
# Settings for the STAGING copy of the app. Only ever used together with the
# staging workspace:
#
#   terraform workspace select staging
#   terraform plan -var-file=staging.tfvars
#
# terraform.tfvars (the emails) is still loaded automatically on top of this.

environment                     = "staging"
frontend_domain_name            = "staging-budgettracker.eliadablah.com"
deploy_branch                   = "develop"
manage_shared_account_resources = false

# Stays off until staging has its own deployed code, same as the live stack.
reminder_schedule_enabled = false
