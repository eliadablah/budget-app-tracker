# Budget App Tracker

Built and owned by **Elikem Adablah** · [cv.eliadablah.com](https://cv.eliadablah.com) · © 2026, all rights reserved.

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

## Environments and branches

There are two copies of the app, each with its own database, login, API and website:

| Environment | Git branch | Address | Terraform workspace |
|---|---|---|---|
| Live (named `dev` in AWS, a name that predates staging) | `main` | budgettracker.eliadablah.com | `default` |
| Staging (the test copy) | `develop` | staging-budgettracker.eliadablah.com | `staging` |

The everyday flow:

1. Branch off `develop` for each piece of work (`git switch -c feature/<name> develop`) and try it locally with `npm run dev`.
2. Merge the feature branch into `develop` and push. That deploys to staging. Test it there.
3. Open a pull request from `develop` into `main`, review the changes, and merge. That deploys to the live app.

## Deploying

Pushing deploys code automatically through GitHub Actions:

- `main` -> the live app (`deploy-backend.yml`, `deploy-frontend.yml`)
- `develop` -> staging (`deploy-staging-backend.yml`, `deploy-staging-frontend.yml`)
- a change under `backend/` builds the Docker image, pushes it to ECR, and updates both Lambdas
- a change under `frontend/` builds the site, syncs it to S3, and clears the CloudFront cache

GitHub gets into AWS through OIDC (`infra/github_oidc.tf`), so no AWS keys are stored in GitHub. Each environment's deploy role trusts only its own branch, so a push to `develop` can never deploy to the live app.

Infrastructure changes (`infra/`) are not automatic: run `terraform plan`, read it, then `terraform apply`. Pick the environment first:

```powershell
# Live app
terraform workspace select default
terraform plan

# Staging
terraform workspace select staging
terraform plan -var-file=staging.tfvars
```

`infra/workspace_guard.tf` stops a plan if the workspace and the settings don't match, so staging settings can never be applied to the live app by accident. Things AWS allows only once per account (the GitHub OIDC provider and the SES email domain) are owned by the live stack; staging uses them (`manage_shared_account_resources = false`).

## Monitoring

`infra/monitoring.tf` creates alarms that email `alert_email` (set in the gitignored `infra/terraform.tfvars`) and a CloudWatch dashboard. `terraform output dashboard_url` prints the link.

## Plaid keys (one-time setup)

The backend reads the Plaid keys from Parameter Store at runtime. Store them by hand - each command prompts for the value, so it never lands in shell history:

```powershell
aws ssm put-parameter --name "/budget-app/dev/plaid/client-id" --type SecureString --overwrite --region us-east-1 --value (Read-Host "Paste your Plaid client ID")
aws ssm put-parameter --name "/budget-app/dev/plaid/secret" --type SecureString --overwrite --region us-east-1 --value (Read-Host "Paste your Plaid secret")
```

Use the Sandbox secret while `plaid_env` is `sandbox` (the default in `infra/variables.tf`). Staging reads its own copy, so run the same two commands with `/budget-app/staging/plaid/...` in place of `/budget-app/dev/plaid/...`.

## Bills and budget

- **Bills** have a name, amount, due date and time, and an optional email reminder. Pay one in parts or in full; what's left goes down with each payment. A bill can repeat monthly with the same amount (next month's is created when it's paid off) or with an amount that changes (next month's is created empty).
- **Payment suggestions**: when a bank transaction looks like a payment toward a bill, the Bills card asks before counting it.
- **Budget** uses the bank's own spending categories. Set a monthly amount per category; the card shows a chart, each category against its limit, and warnings at 80% and over 100%.
- **Notifications** has a switch for each kind of email: to-do reminders, bill reminders, budget alerts, and an 8 AM daily summary. All are off until switched on.

## Email reminders

To-dos can email a reminder at a chosen time, and optionally the day before. The sender is a second Lambda (`infra/reminders.tf`) that EventBridge Scheduler runs every 15 minutes. Emails come from `reminders@eliadablah.com` through Amazon SES, signed with DKIM (`infra/email.tf`) so inboxes trust them.

Setup:

1. Set `reminder_email` in the gitignored `infra/terraform.tfvars`. While the AWS account is in the SES sandbox, that address must be verified in SES.
2. `terraform plan`, then `terraform apply`. This creates the SES domain identity and its three DKIM records in Route 53.
3. Push to `main` so the pipeline deploys the reminder code to both Lambdas.
4. Once SES shows the domain as verified, set `reminder_schedule_enabled = true`, then plan and apply again to turn the schedule on.
5. Turn on "Email reminders" on the Notifications card.

Limits built in: at most 10 reminder emails per user per day, and nothing is sent until the switch on the Notifications card is on.

## Rules of the road

- Never commit `.tfstate`, `.env`, keys, or access tokens.
- Run `terraform plan` and read it before every `terraform apply`.
- Tear down practice stacks with `terraform destroy` when done (the state bucket is protected on purpose).
- Keep an AWS budget alert on the account.

## Prerequisites

Terraform, AWS CLI, Docker, Git. Node is only needed later if the frontend moves to React.
