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
# it down to this one.
resource "aws_iam_openid_connect_provider" "github" {
  url            = "https://token.actions.githubusercontent.com"
  client_id_list = ["sts.amazonaws.com"]

  tags = {
    Project   = var.project_name
    ManagedBy = "terraform"
    Stack     = "infra"
  }
}

# --- Trust policy: exactly who may use the deploy role ---
# Both conditions must match: the ID card was issued for AWS ("aud"), AND it
# comes from this repo's main branch ("sub"). A fork, another repo, a pull
# request, or any other branch is refused.
data "aws_iam_policy_document" "github_deploy_assume_role" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type        = "Federated"
      identifiers = [aws_iam_openid_connect_provider.github.arn]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:sub"
      values   = ["repo:${var.github_repository}:ref:refs/heads/main"]
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
    resources = [aws_lambda_function.backend.arn]
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
