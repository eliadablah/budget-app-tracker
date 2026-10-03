# Changelog

Newest date first.

## 2026-10-03

### Dashboard - Bills, budget, fuller notifications (staging only)

- Bills: add, edit and delete bills with a due date and time. A bill can be paid in parts (each payment lowers what's left) or in full. Repeating bills: `monthly_fixed` (same amount, next month's is created when this one is paid off) and `monthly_variable` (next month's is created with no amount, to fill in). Bills share the to-do reminder fields, so the same sender emails them.
- Payment suggestions: a bank transaction whose description shares a word with an unpaid bill is offered as "Is this a bill payment?". Nothing is counted until confirmed; dismissed ones are remembered.
- Budget: monthly limits per bank category (Plaid's primary categories), a donut chart of this month's spending, each category against its limit, warning tags at 80% and over 100%, and the month's total in the card's corner.
- Notifications: separate switches for to-do reminders, bill reminders, budget alerts and a daily summary; a "Coming up next" list; today's count against the daily limit; a "Send me a test email" button. The old single switch still counts for to-do reminders.
- Scheduler: the reminders Lambda's entry point is now `reminders/scheduler.handler`. Every 15 minutes it sends due to-do and bill reminders; once an hour it checks budget alerts (80% and 100%, once each per category per month); in the 8 AM hour it sends the daily summary (once per day). The old entry point forwards to the new one.
- To-dos are grouped (Today, This week, Later, Anytime, Done) with filter chips. Accounts show a total and a cash / savings / owed breakdown. Transactions show this month's money out and in, filter chips, a category tag, and "counted toward <bill>" labels.
- Layout: three columns on wide screens (Bills, Budget, To-do down the right, Notifications under the first two), one column on narrow screens. The "Coming soon" cards are gone.
- New routes: `GET`/`POST /bills`, `PATCH`/`DELETE /bills/{id}`, `POST /bills/{id}/payments`, `POST /bills/suggestions/dismiss`, `GET`/`PUT /budget`, `POST /settings/notifications/test`.
- IAM: the API may query the `reminders-due` index and send the test email; the scheduler may read (never write) the Plaid keys and bank tokens, and may Scan the table once an hour to find who has notifications on.
- Verification: backend and frontend `tsc` pass; frontend builds; `terraform validate` passes. Staging apply: 10 added, 3 changed, 0 destroyed. Staging's scheduler ran once by hand with no errors. Not yet verified: the new screens and buttons in a browser (needs a login), and no bank is connected in staging. Not applied to the live app.

### Ops - Staging environment and branch-based deploys

- New staging copy of the whole app (own database, login pool, API, both Lambdas, image store, website and HTTPS certificate) at `staging-budgettracker.eliadablah.com`, built from the same Terraform code in a separate `staging` workspace with `infra/staging.tfvars`.
- Branch flow: `develop` deploys to staging (`deploy-staging-backend.yml`, `deploy-staging-frontend.yml`); `main` deploys to the live app. Each environment's deploy role trusts only its own branch (`deploy_branch`).
- `infra/workspace_guard.tf` stops any plan whose workspace and environment don't match, so staging settings can't be applied to the live app.
- Account-wide singletons (GitHub OIDC provider, SES email domain) are owned by the live stack and looked up by staging (`manage_shared_account_resources`). Their Terraform addresses gained `[0]`; `moved` blocks keep the live resources in place.
- The live bucket keeps its original name; other environments get `budget-app-<env>-frontend-<account>`.
- `.gitignore`: `infra/staging.tfvars` is tracked (no private values); saved `*.tfplan` files are ignored.
- Live apply: 1 added (the guard), 1 changed (reminder schedule enabled), 0 destroyed; the two `moved` resources were not recreated. Staging apply: ECR first, image pushed, then 59 added.

### Reminders - Email reminders for to-dos

- To-dos can carry an optional reminder: a date and time, plus an optional email 24 hours earlier. Set when adding a to-do ("Email me a reminder"), cancelled from the bell on the to-do, and cancelled automatically when the to-do is checked off.
- New Notifications card: shows the address reminders go to and an on/off switch, which stays off until turned on.
- New routes: `PUT`/`DELETE /todos/{id}/reminder` and `GET`/`PATCH /settings/notifications`. `POST /todos` accepts optional `remindAt` and `remindDayBefore`.
- New Lambda `budget-app-dev-reminders` (same image, `reminders/sendDueReminders.handler`) run every 15 minutes by EventBridge Scheduler. It reads a new sparse DynamoDB index `reminders-due`, claims each reminder with a conditional update so it is never sent twice, and emails it through Amazon SES. Logs hold counts only, never addresses or titles.
- Email is sent from `reminders@eliadablah.com`: new SES domain identity with DKIM records in Route 53 (`infra/email.tf`). The recipient comes from the new gitignored `reminder_email` variable.
- Safety: at most 10 reminder emails per user per day, no scheduler retries, an error alarm to the existing alerts topic, and least-privilege IAM (send only from the domain, to the one verified address). The schedule stays off until `reminder_schedule_enabled` is set to true.
- The deploy pipeline now updates both Lambdas, and the deploy role may update the new one.
- Texting was built first and its infrastructure applied once (15 added, 4 changed), then replaced with email before deploying, because US toll-free text registration requires a registered business. The texting routes and permissions are removed by the next apply.
- Verification: backend and frontend `tsc` pass; `terraform validate` passes (with the provider's existing `range_key` deprecation warning, now also on the new index); the `reminders-due` index is ACTIVE.

## 2026-10-02

### Ops - Fix first CI and deploy runs

- The first pushed runs all failed, for two reasons:
  - `backend/src/lib/secrets.ts` matched the `.gitignore` rule `secrets.*`, so it was never committed and the backend could not compile anywhere but locally. Renamed to `lib/parameterStore.ts` (imports updated); the ignore rule is left as is.
  - The deploy role's trust condition used `repo:owner/name:ref:...`, but GitHub's OIDC subject for this repo carries permanent IDs (`repo:eliadablah@232940632/budget-app-tracker@1400730037:ref:refs/heads/main`, read from the denied `AssumeRoleWithWebIdentity` events in CloudTrail). Updated the `github_repository` default in `infra/github_oidc.tf` to that form.
- Verification: backend `tsc` passes; `terraform apply` run (0 added, 1 changed, 0 destroyed).

### Ops - Alarms, email alerts, and a health dashboard

- Added `infra/monitoring.tf`: SNS topic `budget-app-dev-alerts` with an email subscription (address from the new `alert_email` variable, set in gitignored `infra/terraform.tfvars`).
- Two log metric filters on the Lambda log group count the backend's own `"Unhandled error"` and `"Plaid error"` log lines, since handled errors never show in the built-in Lambda `Errors` metric.
- Six alarms, all notifying the topic on trip and on recovery: unhandled backend errors, Plaid errors (3+ in 5 min), Lambda crashes, Lambda throttles, Lambda p95 duration over 75% of its timeout (2 periods), API 5xx (3+ in 5 min).
- CloudWatch dashboard `budget-app-dev` (alarm status, API traffic and errors, backend errors, backend speed, DynamoDB usage); new `dashboard_url` output.
- Verification: `terraform validate` passes; `terraform apply` run (11 added, 0 changed, 0 destroyed). The email subscription stays pending until the confirmation link is clicked. No alarm has been deliberately tripped to test delivery.

### Ops - GitHub Actions CI and automatic deploys (OIDC)

- Added `infra/github_oidc.tf`: GitHub OIDC provider and role `budget-app-dev-github-deploy`, assumable only by this repo's `main` branch. Permissions limited to pushing the backend image, updating the one Lambda's code, writing the frontend bucket, and invalidating the one CloudFront distribution. No AWS keys are stored in GitHub. Terraform changes stay manual.
- Added `.github/workflows/ci.yml` (every push and PR: backend compile, frontend type-check and build, `terraform fmt -check` and `validate`), `deploy-backend.yml` and `deploy-frontend.yml` (on pushes to `main` touching their folder, or run by hand).
- New outputs: `github_deploy_role_arn`, `frontend_distribution_id`.
- Verification: `terraform apply` run (3 added). The workflows themselves have not run yet - they first execute when pushed to GitHub.

### Bank - Transactions feed, accounts as tiles

- Backend: `GET /bank/transactions` (`bank/listBankTransactions.ts`) returns transactions from every connected bank since the 1st of last month, newest first, via Plaid `/transactions/get` with paging. Each carries `countsAsSpending` (false for money in, transfers out, and credit card payments). A bank that fails is named in `failedBanks` instead of failing the request. Extracted `bank/listBankConnections.ts`, now shared with accounts.
- Infra: added the `GET /bank/transactions` route.
- Frontend: `components/transactions/` (`TransactionsCard`, `TransactionRow`) and `hooks/useTransactions.ts`; the list shows 10 at a time with "Show more". "Spent this month" tile is now live (sum of `countsAsSpending` transactions dated this month).
- Frontend: accounts are laid out side by side as tiles (`.account-list` grid) instead of a vertical list, with the same hover pop as the headline tiles. `Card` gained a `wide` prop; Accounts and Recent transactions span the full dashboard width, and the connect button moved to the Accounts card header.
- Verification: `tsc` (both projects) and `vite build` pass; image pushed, Lambda updated, `terraform apply` run (1 added), frontend uploaded and cache invalidated. Invoked the Lambda directly for the real user: HTTP 200, 32 Sandbox transactions, 22 counted as spending, no failed banks. The Sandbox data ends 2026-09-26, so "Spent this month" reads $0 for October. Layout not yet checked in a browser by me.

### Frontend - Headline tiles always fit, hover pop

- `StatTile` passes its number's length to CSS (`--chars`); `.stat-tile__value` sizes itself from the tile's width (container query units) so a long number shrinks to fit instead of overflowing. Fixes "$62,589.00" spilling out of the "Cash in accounts" tile.
- Headline tiles now show whole dollars (`formatMoneyWhole`); account rows keep cents.
- Hover: stat tiles scale up with an accent border; cards lift slightly. Movement is turned off under `prefers-reduced-motion`.
- `lib/plaid.ts`: forgets cached Plaid keys when Plaid answers `INVALID_API_KEYS`, so a corrected key takes effect without recycling the Lambda.
- Verification: `tsc` and `vite build` pass; frontend uploaded and cache invalidated. Bank connect flow confirmed working in Sandbox by the user (Tartan Bank connected, balances shown). The tile fit and hover have not been checked in a browser by me.

### Bank - Plaid Sandbox connection and account balances

- Backend: new `src/bank/` (`createLinkToken`, `connectBank`, `listBankAccounts`, `removeBank`, `bankTokenStore`, `validateBank`), `lib/plaid.ts` (calls Plaid's REST API with `fetch`, no SDK), `lib/secrets.ts` (Parameter Store; later renamed `lib/parameterStore.ts`). Added `@aws-sdk/client-ssm`.
- Secrets: the Plaid client ID and secret are read at runtime from Parameter Store (`/budget-app/dev/plaid/client-id`, `/secret`), set by hand with `aws ssm put-parameter` - they never pass through Terraform or its state. Each connected bank's access token is stored as its own `SecureString` under `/budget-app/dev/plaid/items/<user>/<item>`; DynamoDB holds only the connection record (`sk = BANK#<item id>`, institution name).
- Infra: four JWT-protected routes (`POST /bank/link-token`, `POST /bank/connections`, `GET /bank/accounts`, `DELETE /bank/connections/{id}`); `iam.tf` adds a policy limited to read on the two key parameters and read/write/delete on `items/*`; Lambda gets `PLAID_ENV` (new `plaid_env` variable, default `sandbox`) and `PLAID_PARAM_PREFIX`, timeout 10s -> 20s.
- Frontend: `components/accounts/` (`AccountsCard`, `BankGroup`, `AccountRow`), `hooks/useBanks.ts`, `lib/plaidLink.ts` (loads Plaid Link on first use), `lib/formatMoney.ts`. The Accounts card replaces its placeholder, supports several banks, and a "Cash in accounts" tile totals checking and savings.
- Verification: `tsc` (both projects) and `vite build` pass. Image pushed, Lambda updated, `terraform apply` run (5 added, 1 changed, 0 destroyed), frontend uploaded and cache invalidated. Live checks: site serves the new build; `/bank/accounts` without a login returns 401. The connect flow itself has NOT been tested - at deploy time the `/secret` parameter still held a placeholder value, so Plaid calls fail until the real Sandbox secret is saved.

### Frontend - Dashboard layout, to-do check-off and delete

- Replaced the single to-do card with a one-page dashboard: `components/dashboard/Dashboard.tsx` (page), `SummaryRow.tsx` (headline numbers), `ComingSoonCard.tsx` (placeholders for bills, budget, accounts), `components/layout/AppHeader.tsx` (month, date, log out).
- New reusable pieces in `components/ui/` (`Card`, `StatTile`, `Badge`, `TrashIcon`, with an `index.ts` barrel).
- To-dos: `TodoCard.tsx` replaces `TodoApp.tsx`; each row now has a checkbox (mark done) and a delete button. Data handling moved into `hooks/useTodos.ts`; toggle and delete update the screen first and roll back if the server refuses.
- `lib/api.ts`: calls moved to `/todos`; added `updateTodo` and `deleteTodo`.
- `styles/index.css`: new navy theme with a peach accent and green for "done". Money tiles show a dash until bills and budget exist.
- Verification: `tsc` and `vite build` pass with no errors. Built files uploaded to S3 and CloudFront cache invalidated; the live site serves the new build. Logged-in behavior (add, check off, delete) not yet tested in a browser.

### Backend - To-do update, delete, and input validation

- `handler.ts` now routes on API Gateway's `routeKey` (`GET /todos`, `POST /todos`, `PATCH /todos/{id}`, `DELETE /todos/{id}`) instead of on the HTTP method alone.
- Added `todos/updateTodo.ts` (sets `done`; 404 if the item doesn't exist) and `todos/deleteTodo.ts`.
- Added `todos/validateTodo.ts` and `lib/http.ts`: bad input (missing or over-long title, malformed JSON, non-boolean `done`, bad id) now returns a 400 with a message instead of a 500. Error responses are JSON (`{ "message": ... }`).
- Verification: `tsc` passes. Image built, pushed to ECR, and the Lambda updated to it (`LastUpdateStatus: Successful`). The new update/delete paths have not yet been exercised with a real login.

### Infra - API routes moved under /todos

- `infra/apigateway.tf`: the two `GET /` and `POST /` routes are replaced by one `for_each` route resource driven by a `local.api_routes` list (four `/todos` routes), all JWT-protected. CORS now also allows `PATCH` and `DELETE`.
- Migration note: the old `/` routes are removed, so the backend image, this change, and the frontend must be deployed together. The live site's to-do calls fail between the Terraform apply and the frontend upload.
- Verification: `terraform apply` run (4 added, 1 changed, 2 destroyed). Confirmed against the live API: `/todos` without a login returns 401, the old `/` route returns 404.

### Security - Cognito self sign-up disabled

- `infra/cognito.tf`: added `admin_create_user_config { allow_admin_create_user_only = true }` to the user pool. Previously anyone with the (public) app client ID could register their own account; now only the AWS account owner can create users.
- Existing users and logins are unaffected (in-place settings change, no replacement).

### Frontend - React + Vite + TypeScript scaffold, dark-theme restyle

- Added `frontend/` (React 18 + TypeScript + Vite, static build output - fits the S3 + CloudFront architecture from the README).
- `src/lib/api.ts`: single point of contact with the backend API (`getTodos`, `createTodo`), reading the API URL from `VITE_API_URL` (`.env.local`, gitignored; `.env.example` committed as a template).
- Components, one per file: `TodoList`, `TodoItem`, `TodoForm`, `TodoStats` (a progress stat tile, computed client-side from already-loaded data).
- `src/types/todo.ts` mirrors `backend/src/types/todo.ts` so both sides of the API agree on shape.
- Restyled `src/styles/index.css` to a dark, card-based theme (requested look-and-feel), using the dataviz skill's validated color-token structure (CSS custom properties by role) rather than ad hoc hex values, so a future real chart (budget dashboard) can reuse the same tokens.
- `npm install` surfaced a moderate/high `esbuild`/`vite` advisory (GHSA-67mh-4wv8-2f99, dev-server only, not present in production builds); resolved via `npm audit fix --force` (Vite 5 -> 8). Confirmed with a clean `npx tsc --noEmit` and `npm run build` afterward - 0 vulnerabilities, 0 type errors.
- Verification: ran via `npm run dev`, loaded in a real browser against the live API, confirmed working end-to-end (list loads, add-todo works).

### Infra - API Gateway (public URL) + CORS fix

- Added `infra/apigateway.tf`: `aws_apigatewayv2_api` (HTTP API), `aws_apigatewayv2_integration` (Lambda proxy), `aws_apigatewayv2_stage` (`$default`, auto-deploy), `aws_lambda_permission` granting API Gateway invoke rights scoped to this one API.
- Added `api_url` output.
- Verification: `terraform apply` run successfully. Tested with real HTTP requests (not AWS CLI) - `GET`/`POST` against the live URL both confirmed working against the real Lambda and DynamoDB table.
- **Known gap, deliberate for now:** `authorization_type = "NONE"` - the API has no login/auth yet. Acceptable short-term since only test data exists; Cognito (build-order step 7) is the fix and should land before any real data touches this.
- **Bug found and fixed:** the original route used `$default` (catch-all), which also intercepted CORS preflight `OPTIONS` requests and forwarded them to the Lambda (which doesn't handle `OPTIONS`, so it replied 405) - browsers correctly blocked the real `POST` as a result (`GET` worked since it needs no preflight). Fixed by replacing it with explicit `GET /` and `POST /` routes, leaving `OPTIONS` unclaimed so API Gateway's built-in CORS handling answers it automatically. Also added a `cors_configuration` block to the API (was missing entirely in the first version), scoped to `http://localhost:5173` for now - the real CloudFront domain gets added once the frontend is actually deployed.

### Infra - Lambda function

- Added `infra/lambda.tf`: `aws_lambda_function.backend` (container image from ECR, wears the IAM role from `iam.tf`, 256 MB / 10s timeout, `TABLE_NAME` env var), plus an explicit `aws_cloudwatch_log_group` (14-day retention) so AWS doesn't auto-create a "never expire" one.
- Added `lambda_function_name` / `lambda_function_arn` outputs.
- Verification: `terraform apply` run successfully. Confirmed directly via `aws lambda get-function` (`State: Active`, code hash matches the pushed image). Invoked directly (`aws lambda invoke`) for both create and list - confirmed real items written to and read from DynamoDB.

## 2026-10-01

### Infra - IAM role for the Lambda

- Added `infra/iam.tf`: `aws_iam_role.lambda_exec` (trust policy scoped to `lambda.amazonaws.com` only), an inline policy scoped to exactly 5 DynamoDB actions (`GetItem`/`PutItem`/`UpdateItem`/`DeleteItem`/`Query`) on only the one table's ARN, and AWS's managed `AWSLambdaBasicExecutionRole` for CloudWatch Logs.
- Added `lambda_role_arn` output for the upcoming Lambda resource to reference.
- Verification: `terraform apply` run successfully. Confirmed directly against AWS via `aws iam get-role` - role exists, trust policy matches, tags correct.

### Backend - TypeScript Lambda code + ECR repository

- Added `backend/` (TypeScript): `src/handler.ts` (API Gateway entry point), `src/todos/createTodo.ts` + `listTodos.ts`, `src/lib/dynamodb.ts` (shared client), `src/types/todo.ts`.
- Single DynamoDB table, single-table design: `pk = USER#<id>`, `sk = TODO#<timestamp>#<uuid>` for chronological queries without extra sorting.
- `USER_ID` is temporarily hardcoded (`"me"`) until Cognito (build-order step 7) exists.
- Added `backend/Dockerfile`: multi-stage build (Node 20 compiles TypeScript, final image is AWS's official `public.ecr.aws/lambda/nodejs:20` base with only compiled output + production deps).
- Added `infra/ecr.tf`: `aws_ecr_repository.backend`, with vulnerability scan-on-push enabled, plus `ecr_repository_url` output.
- Verification: `terraform apply` run successfully (ECR repo confirmed via `aws ecr describe-repositories`). Image built via `backend/Dockerfile` and pushed to ECR, confirmed via `aws ecr describe-images` (`ACTIVE`, ~124 MB).

### Infra - DynamoDB table

- Added `infra/` stack (versions, variables, outputs, and the table itself).
- Single-table design: one `aws_dynamodb_table.app` holding both to-do items and budget entries, keyed by `pk`/`sk`.
- On-demand billing (`PAY_PER_REQUEST`) and point-in-time recovery enabled.
- `infra/` now uses the S3 backend created by `bootstrap/` for remote state, with S3-native locking (`use_lockfile`), so no separate DynamoDB lock table is needed.
- Verification: `terraform apply` run successfully. Confirmed directly against AWS (not just Terraform state) via `aws dynamodb describe-table` - table `budget-app-dev` is `ACTIVE`, `PAY_PER_REQUEST` billing, 0 items (expected, nothing writes to it yet).

## 2026-09-20

### Foundation - Repo scaffold

- Added `.gitignore` covering Terraform state, variable files, credentials, and build output. `.terraform.lock.hcl` is deliberately tracked.
- Added `README.md` with the target architecture, repo layout, and build order.
- Added this changelog.

### Foundation - Terraform state bootstrap

- Added `bootstrap/` stack that creates the S3 bucket used for remote Terraform state.
- Bucket has versioning, AES256 encryption, all public access blocked, and `prevent_destroy` set.
- Bucket name is derived from the AWS account ID, so nothing account-specific is hardcoded.
- Verification: files written only. `terraform init` / `plan` / `apply` not yet run.
