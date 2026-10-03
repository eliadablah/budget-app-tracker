# infra/workspace_guard.tf
# What: a safety lock for running two environments from the same code.
#
# Each environment keeps its own state in its own Terraform workspace:
#   default workspace -> the live app  (environment = "dev")
#   staging workspace -> the test copy (environment = "staging", via staging.tfvars)
#
# The dangerous mistake is mixing them - for example running a plan with
# staging.tfvars while still in the default workspace. Terraform would then
# try to RENAME every live resource to its staging name, which for most AWS
# resources means delete and recreate (losing the live database).
#
# This resource creates nothing in AWS. It only checks that the workspace and
# the environment match, and stops the plan with a clear error if they don't.

resource "terraform_data" "workspace_guard" {
  lifecycle {
    precondition {
      condition = (
        terraform.workspace == "default"
        ? var.environment == "dev"
        : var.environment == terraform.workspace
      )
      error_message = "Workspace and environment don't match. Live app: workspace \"default\" with no extra -var-file. Staging: run `terraform workspace select staging` and add -var-file=staging.tfvars."
    }
  }
}
