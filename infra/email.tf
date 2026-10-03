# infra/email.tf
# What: lets the app send email FROM its own domain (reminders@eliadablah.com)
#       through Amazon SES.
#
# Why our own domain and not a Gmail address: inboxes check that mail really
# comes from the domain it claims. Mail "from @gmail.com" sent by Amazon
# fails that check and tends to land in spam. With DKIM, our domain
# publishes public keys in DNS, SES signs every email with the matching
# private keys, and Gmail can confirm the email is genuinely ours.
#
# Two pieces:
#   1. The domain identity in SES (SES generates three DKIM keys for it)
#   2. Three DNS records publishing those keys, added automatically since the
#      hosted zone lives in this same account

locals {
  reminder_from = "reminders@${var.email_domain}"
  # Built from its parts (not read from the resource) so staging, which
  # doesn't own the domain, can still name it in its email permission.
  email_domain_arn = "arn:aws:ses:${var.aws_region}:${data.aws_caller_identity.current.account_id}:identity/${var.email_domain}"
}

# A domain can be registered in SES only once per account, so only the live
# stack creates it (count = 1). Staging sends from the same domain.
resource "aws_sesv2_email_identity" "domain" {
  count = var.manage_shared_account_resources ? 1 : 0

  email_identity = var.email_domain

  tags = {
    Project     = var.project_name
    ManagedBy   = "terraform"
    Stack       = "infra"
    Environment = var.environment
  }
}

# SES hands back three "tokens". Each becomes one CNAME record:
#   <token>._domainkey.eliadablah.com -> <token>.dkim.amazonses.com
# SES checks these on its own and marks the domain verified, usually within
# minutes (it can take up to 72 hours).
resource "aws_route53_record" "ses_dkim" {
  count = var.manage_shared_account_resources ? 3 : 0

  zone_id = data.aws_route53_zone.main.zone_id
  name    = "${aws_sesv2_email_identity.domain[0].dkim_signing_attributes[0].tokens[count.index]}._domainkey.${var.email_domain}"
  type    = "CNAME"
  ttl     = 600
  records = ["${aws_sesv2_email_identity.domain[0].dkim_signing_attributes[0].tokens[count.index]}.dkim.amazonses.com"]
}

# Same rename-in-code-only note as in github_oidc.tf: "domain" became
# "domain[0]" when count was added, and this keeps Terraform from deleting
# and recreating the live email domain.
moved {
  from = aws_sesv2_email_identity.domain
  to   = aws_sesv2_email_identity.domain[0]
}
