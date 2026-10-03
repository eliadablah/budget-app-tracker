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
}

resource "aws_sesv2_email_identity" "domain" {
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
  count = 3

  zone_id = data.aws_route53_zone.main.zone_id
  name    = "${aws_sesv2_email_identity.domain.dkim_signing_attributes[0].tokens[count.index]}._domainkey.${var.email_domain}"
  type    = "CNAME"
  ttl     = 600
  records = ["${aws_sesv2_email_identity.domain.dkim_signing_attributes[0].tokens[count.index]}.dkim.amazonses.com"]
}
