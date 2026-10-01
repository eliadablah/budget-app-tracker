# Changelog

Newest date first.

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
