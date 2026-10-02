# Budget App Tracker

A personal to-do list and budget tracker built on AWS, as a hands-on way to practice Terraform, Docker, and GitHub Actions together.

Single user (me). Real bank data comes last, and only through Plaid's Sandbox first.

## Target architecture

```
Browser -> CloudFront -> S3                      (static frontend)
Browser -> API Gateway -> Lambda -> DynamoDB      (backend)
                             \-> Plaid            (bank data, later)
Cognito = login    EventBridge = daily sync    Parameter Store = secrets
```

Lambdas run outside a VPC on purpose. That avoids a NAT Gateway (about $33/month).

## Repo layout

```
bootstrap/   One-time stack that creates the S3 bucket holding Terraform state
infra/       Main stack: DynamoDB, Lambda, API Gateway, Cognito, S3 + CloudFront, domain
backend/     TypeScript Lambda code and its Dockerfile
frontend/    React + Vite + TypeScript dashboard (built to static files)
.github/     GitHub Actions: checks on every push, automatic deploys from main
docs/        Notes (later)
```

## Build order (and why)

1. Repo hygiene: `.gitignore` before the first commit
2. Terraform state bucket (`bootstrap/`): Terraform needs somewhere safe to remember what it built
3. DynamoDB table: bottom of the stack, depends on nothing
4. IAM role for the Lambda: least-privilege access to that table
5. ECR repo, Docker image, Lambda: the image must exist before the function
6. API Gateway: needs the Lambda to point at
7. Cognito: login, added once the plumbing works
8. Frontend (S3 + CloudFront)
9. GitHub Actions with OIDC
10. EventBridge, Parameter Store, Plaid Sandbox

## Deploying

Pushing to `main` deploys code automatically through GitHub Actions:

- a change under `backend/` builds the Docker image, pushes it to ECR, and updates the Lambda
- a change under `frontend/` builds the site, syncs it to S3, and clears the CloudFront cache

GitHub gets into AWS through OIDC (`infra/github_oidc.tf`), so no AWS keys are stored in GitHub. Infrastructure changes (`infra/`) are not automatic: run `terraform plan`, read it, then `terraform apply`.

## Monitoring

`infra/monitoring.tf` creates alarms that email `alert_email` (set in the gitignored `infra/terraform.tfvars`) and a CloudWatch dashboard. `terraform output dashboard_url` prints the link.

## Plaid keys (one-time setup)

The backend reads the Plaid keys from Parameter Store at runtime. Store them by hand - each command prompts for the value, so it never lands in shell history:

```powershell
aws ssm put-parameter --name "/budget-app/dev/plaid/client-id" --type SecureString --overwrite --region us-east-1 --value (Read-Host "Paste your Plaid client ID")
aws ssm put-parameter --name "/budget-app/dev/plaid/secret" --type SecureString --overwrite --region us-east-1 --value (Read-Host "Paste your Plaid secret")
```

Use the Sandbox secret while `plaid_env` is `sandbox` (the default in `infra/variables.tf`).

## Rules of the road

- Never commit `.tfstate`, `.env`, keys, or access tokens.
- Run `terraform plan` and read it before every `terraform apply`.
- Tear down practice stacks with `terraform destroy` when done (the state bucket is protected on purpose).
- Keep an AWS budget alert on the account.

## Prerequisites

Terraform, AWS CLI, Docker, Git. Node is only needed later if the frontend moves to React.
