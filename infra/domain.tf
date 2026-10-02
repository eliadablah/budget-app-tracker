# infra/domain.tf
# What: wires the frontend up to a real, memorable domain
# (budgettracker.eliadablah.com) instead of CloudFront's generated
# *.cloudfront.net address. Three pieces, in dependency order:
#   1. An SSL certificate for that domain (HTTPS is mandatory on a custom
#      CloudFront domain - there's no "skip this" option)
#   2. Proof to AWS that you actually control the domain (DNS validation -
#      a record gets added automatically since the zone already lives in
#      this same AWS account)
#   3. The actual DNS record pointing the domain at CloudFront

# The existing hosted zone for eliadablah.com - looked up by name rather
# than a hardcoded zone ID, so this stays correct if the zone is ever
# recreated.
data "aws_route53_zone" "main" {
  name         = "eliadablah.com."
  private_zone = false
}

# NOTE: CloudFront only accepts certificates from us-east-1, regardless of
# which region everything else lives in. This project's provider is already
# pinned to us-east-1 (see versions.tf), so no extra provider alias is
# needed here - if that ever changes, this resource would need one.
resource "aws_acm_certificate" "frontend" {
  domain_name       = var.frontend_domain_name
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Project     = var.project_name
    ManagedBy   = "terraform"
    Stack       = "infra"
    Environment = var.environment
  }
}

# ACM hands back a specific DNS record it wants to see before it will issue
# the certificate - this creates exactly that record, automatically, since
# the zone is already in this account. (If the domain lived elsewhere, this
# step would instead be something to do manually at that registrar.)
resource "aws_route53_record" "cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.frontend.domain_validation_options : dvo.domain_name => {
      name  = dvo.resource_record_name
      type  = dvo.resource_record_type
      value = dvo.resource_record_value
    }
  }

  zone_id = data.aws_route53_zone.main.zone_id
  name    = each.value.name
  type    = each.value.type
  records = [each.value.value]
  ttl     = 60
}

# Waits for ACM to actually confirm the validation record it asked for is in
# place and correct - the certificate isn't safe to attach to CloudFront
# until this resolves.
resource "aws_acm_certificate_validation" "frontend" {
  certificate_arn         = aws_acm_certificate.frontend.arn
  validation_record_fqdns = [for r in aws_route53_record.cert_validation : r.fqdn]
}

# The actual "point the domain here" record - an ALIAS (Route 53's own
# extension, not a plain CNAME), which is free and the standard way to point
# a domain at a CloudFront distribution.
resource "aws_route53_record" "frontend" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = var.frontend_domain_name
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.frontend.domain_name
    zone_id                = aws_cloudfront_distribution.frontend.hosted_zone_id
    evaluate_target_health = false
  }
}
