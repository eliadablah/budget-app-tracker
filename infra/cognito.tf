# infra/cognito.tf
# What: the login system. Everything built before this trusted every request
#       by default - this is what finally locks the door: only requests
#       carrying a valid login token from this specific user pool get let
#       through to the API (wired up in apigateway.tf).

resource "aws_cognito_user_pool" "main" {
  name = "${var.project_name}-${var.environment}"

  # Password rules enforced by Cognito itself, not hand-rolled validation
  # code - one less thing to get wrong.
  password_policy {
    minimum_length    = 12
    require_lowercase = true
    require_uppercase = true
    require_numbers   = true
    require_symbols   = true
  }

  # Log in with an email address rather than a separate invented username -
  # simpler for a single-user app, and doubles as how a password reset would
  # reach you later.
  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]

  # Single-user app: nobody can sign themselves up. Without this, anyone who
  # finds the app client ID (it's public, in the frontend code) could create
  # their own account in this pool. Accounts are created only by the AWS
  # account owner (console or `aws cognito-idp admin-create-user`).
  admin_create_user_config {
    allow_admin_create_user_only = true
  }

  tags = {
    Project     = var.project_name
    ManagedBy   = "terraform"
    Stack       = "infra"
    Environment = var.environment
  }
}

# The "app client" - an ID badge the FRONTEND uses to talk to the user pool.
# Deliberately has no secret: browsers can't keep a secret safely (anyone can
# view page source), so public clients like this are secret-less by design -
# security comes from the login flow itself, not a hidden value in the code.
resource "aws_cognito_user_pool_client" "frontend" {
  name         = "${var.project_name}-${var.environment}-frontend"
  user_pool_id = aws_cognito_user_pool.main.id

  # USER_PASSWORD_AUTH: the plain email+password login flow. (A more complex
  # flow, USER_SRP_AUTH, exists but adds cryptographic steps this
  # single-user personal project doesn't need.)
  explicit_auth_flows = ["ALLOW_USER_PASSWORD_AUTH", "ALLOW_REFRESH_TOKEN_AUTH"]

  generate_secret = false
}
