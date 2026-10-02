# infra/ecr.tf
# What: the empty "shelf" (container registry) that will hold the Docker
#       image built from backend/. Terraform only creates the shelf here -
#       the actual image gets built and uploaded separately with Docker
#       commands (not something Terraform does).

resource "aws_ecr_repository" "backend" {
  name = "${var.project_name}-${var.environment}"

  # MUTABLE lets you push over the same tag (e.g. "latest") repeatedly, which
  # is convenient for a personal project. A production team would often set
  # this to IMMUTABLE so a tag can never silently change underneath them.
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true # AWS scans every image you push for known vulnerabilities
  }

  tags = {
    Project     = var.project_name
    ManagedBy   = "terraform"
    Stack       = "infra"
    Environment = var.environment
  }
}
