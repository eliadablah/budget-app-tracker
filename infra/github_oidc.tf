# infra/github_oidc.tf
# What: lets GitHub Actions deploy this app to AWS WITHOUT any AWS password
#       or access key stored in GitHub.
#
# How it works (plain terms): when a GitHub workflow runs, GitHub hands it a
# short-lived, signed ID card saying "I am a workflow in repo X, on branch
# Y". AWS is told here to trust ID cards from GitHub - but only ones for
# THIS repo's main branch - and to swap one for temporary AWS credentials
# that expire within the hour. Nothing long-lived exists to leak.
# This is called OIDC (OpenID Connect).

# GitHub identifies a repo on its ID card as "owner@<owner id>/name@<repo
# id>". The numbers are permanent IDs: if this repo or account were ever
# renamed or deleted, and someone else took the name, their ID card would
# carry different numbers and be refused. (Found from the denied attempts in
# CloudTrail - event AssumeRoleWithWebIdentity, field userIdentity.userName.)
variable "github_repository" {
  description = "The GitHub repo allowed to deploy, in the form GitHub puts in its OIDC subject: owner@ownerId/name@repoId."
  type        = string
  default     = "eliadablah@232940632/budget-app-tracker@1400730037"
}

# Registers GitHub as an identity AWS will accept ID cards from. One of
# these per AWS account covers every repo; the role below is what narrows
# it down to this one. Because there can only be one per account, the live
# stack owns it (count = 1) and staging only looks it up (count = 0).
resource "aws_iam_openid_connect_provider" "github" {
  count = var.manage_shared_account_resources ? 1 : 0

  url            = "https://token.actions.githubusercontent.com"
  client_id_list = ["sts.amazonaws.com"]

  tags = {
    Project   = var.project_name
    ManagedBy = "terraform"
    Stack     = "infra"
  }
}

# Adding "count" above changes this resource's address from "github" to
# "github[0]". This tells Terraform it's the same resource, just renamed in
# the code - without it, Terraform would delete and recreate it.
moved {
  from = aws_iam_openid_connect_provider.github
  to   = aws_iam_openid_connect_provider.github[0]
}

# Staging: find the provider the live stack already created.
data "aws_iam_openid_connect_provider" "github" {
  count = var.manage_shared_account_resources ? 0 : 1
  url   = "https://token.actions.githubusercontent.com"
}

locals {
  github_oidc_provider_arn = (
    var.manage_shared_account_resources
    ? aws_iam_openid_connect_provider.github[0].arn
    : data.aws_iam_openid_connect_provider.github[0].arn
  )
}

# --- Trust policy: exactly who may use the deploy role ---
# Both conditions must match: the ID card was issued for AWS ("aud"), AND it
# comes from this repo's deploy branch ("sub") - main for the live app,
# develop for staging. A fork, another repo, a pull request, or any other
# branch is refused, so a push to develop can never deploy to the live app.
data "aws_iam_policy_document" "github_deploy_assume_role" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type        = "Federated"
      identifiers = [local.github_oidc_provider_arn]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:sub"
      values   = ["repo:${var.github_repository}:ref:refs/heads/${var.deploy_branch}"]
    }
  }
}

resource "aws_iam_role" "github_deploy" {
  name               = "${var.project_name}-${var.environment}-github-deploy"
  assume_role_policy = data.aws_iam_policy_document.github_deploy_assume_role.json

  tags = {
    Project     = var.project_name
    ManagedBy   = "terraform"
    Stack       = "infra"
    Environment = var.environment
  }
}

# --- Permissions: the least the deploy needs, and nothing else ---
# It can ship new CODE (backend image, website files). It cannot change
# infrastructure, read the database, or read any secret - Terraform changes
# stay a manual, reviewed step on purpose.
data "aws_iam_policy_document" "github_deploy" {
  # Logging in to ECR is account-wide by design (AWS doesn't allow scoping
  # this one action to a single repository).
  statement {
    sid       = "EcrLogin"
    effect    = "Allow"
    actions   = ["ecr:GetAuthorizationToken"]
    resources = ["*"]
  }

  statement {
    sid    = "PushBackendImage"
    effect = "Allow"
    actions = [
      "ecr:BatchCheckLayerAvailability",
      "ecr:BatchGetImage",
      "ecr:CompleteLayerUpload",
      "ecr:GetDownloadUrlForLayer",
      "ecr:InitiateLayerUpload",
      "ecr:PutImage",
      "ecr:UploadLayerPart",
    ]
    resources = [aws_ecr_repository.backend.arn]
  }

  statement {
    sid    = "PointLambdaAtNewImage"
    effect = "Allow"
    actions = [
      "lambda:GetFunction",
      "lambda:GetFunctionConfiguration",
      "lambda:UpdateFunctionCode",
    ]
    # Both functions run the same image, so the pipeline updates both.
    resources = [aws_lambda_function.backend.arn, aws_lambda_function.reminders.arn]
  }

  statement {
    sid       = "ListFrontendBucket"
    effect    = "Allow"
    actions   = ["s3:ListBucket"]
    resources = [aws_s3_bucket.frontend.arn]
  }

  statement {
    sid    = "UploadFrontendFiles"
    effect = "Allow"
    actions = [
      "s3:DeleteObject",
      "s3:PutObject",
    ]
    resources = ["${aws_s3_bucket.frontend.arn}/*"]
  }

  statement {
    sid       = "RefreshCdnCache"
    effect    = "Allow"
    actions   = ["cloudfront:CreateInvalidation"]
    resources = [aws_cloudfront_distribution.frontend.arn]
  }
}

resource "aws_iam_role_policy" "github_deploy" {
  name   = "${var.project_name}-${var.environment}-github-deploy"
  role   = aws_iam_role.github_deploy.id
  policy = data.aws_iam_policy_document.github_deploy.json
}
