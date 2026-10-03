# infra/frontend.tf
# What: hosts the built frontend (frontend/dist/, after `npm run build`) as a
#       real, permanent public website - no laptop or terminal required to
#       open it afterward.
#
# Why S3 + CloudFront, not just S3 by itself: S3 CAN serve a website
# directly, but only over plain HTTP, and only if the bucket itself is made
# public. Putting CloudFront in front of a PRIVATE bucket instead gives you
# HTTPS, global caching (faster loads worldwide), and the bucket itself
# never has to be public - CloudFront is the only thing allowed to read it,
# proven via "Origin Access Control" below, not by the bucket being open to
# everyone.

data "aws_caller_identity" "current" {}

locals {
  # The live bucket was named before staging existed, without the
  # environment in it. A bucket can't be renamed (only deleted and remade),
  # so the live app keeps its original name and every other environment gets
  # its own name with the environment included.
  frontend_bucket_name = (
    var.environment == "dev"
    ? "${var.project_name}-frontend-${data.aws_caller_identity.current.account_id}"
    : "${var.project_name}-${var.environment}-frontend-${data.aws_caller_identity.current.account_id}"
  )
}

resource "aws_s3_bucket" "frontend" {
  bucket = local.frontend_bucket_name
}

# Block every form of public access on the bucket - CloudFront reaches it
# through a signed, internal mechanism (OAC), never directly or publicly.
resource "aws_s3_bucket_public_access_block" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# The "signed badge" CloudFront presents to S3 to prove it's allowed to read -
# the modern, secure replacement for the older pattern of just making an S3
# bucket public for website hosting.
resource "aws_cloudfront_origin_access_control" "frontend" {
  name                              = "${var.project_name}-${var.environment}-frontend"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_distribution" "frontend" {
  enabled             = true
  default_root_object = "index.html"

  # The custom domain this distribution answers to, in addition to its own
  # generated *.cloudfront.net address (that one keeps working regardless).
  aliases = [var.frontend_domain_name]

  origin {
    domain_name              = aws_s3_bucket.frontend.bucket_regional_domain_name
    origin_id                = "s3-frontend"
    origin_access_control_id = aws_cloudfront_origin_access_control.frontend.id
  }

  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "s3-frontend"
    viewer_protocol_policy = "redirect-to-https"
    # AWS's own predefined "CachingOptimized" policy - a well-known constant
    # ID, not something this project defines itself. Good default caching
    # behavior for static files without writing custom cache rules.
    cache_policy_id = "658327ea-f89d-4fab-a63d-7e88639e58f6"
  }

  # A private S3 bucket replies 403 (not 404) to a missing key. Without this,
  # refreshing on any page other than the homepage would show a raw error
  # instead of the app - redirecting both 403 and 404 back to index.html lets
  # the app's own JavaScript decide what to show. Not needed yet (there's
  # only one page today) but costs nothing now and avoids a surprise once a
  # second page/route is added later.
  custom_error_response {
    error_code         = 403
    response_code      = 200
    response_page_path = "/index.html"
  }

  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/index.html"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  # A custom domain on CloudFront requires its own validated ACM certificate
  # (domain.tf) - CloudFront's free default certificate only covers its own
  # *.cloudfront.net address, not a custom domain. "sni-only" is the modern,
  # free way to serve HTTPS on a custom domain (the older alternative,
  # dedicated IP addresses, costs extra and is almost never needed today).
  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate_validation.frontend.certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  tags = {
    Project     = var.project_name
    ManagedBy   = "terraform"
    Stack       = "infra"
    Environment = var.environment
  }
}

# Bucket policy: ONLY this specific CloudFront distribution may read objects -
# not "any CloudFront distribution in the account," not the public internet.
resource "aws_s3_bucket_policy" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AllowCloudFrontServicePrincipal"
        Effect    = "Allow"
        Principal = { Service = "cloudfront.amazonaws.com" }
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.frontend.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.frontend.arn
          }
        }
      }
    ]
  })
}
