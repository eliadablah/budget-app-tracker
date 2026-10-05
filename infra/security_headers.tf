# infra/security_headers.tf
# What: the "safety labels" CloudFront attaches to every page it serves.
#       They are instructions for the visitor's browser - the site looks and
#       works the same, but the browser becomes stricter about it.
#
# What each one tells the browser:
#   Strict-Transport-Security  "Only ever talk to this site over HTTPS, for
#                               the next year" - blocks downgrade tricks on
#                               public Wi-Fi.
#   X-Content-Type-Options     "Trust the file type the server states, don't
#                               guess" - stops a file being run as a script
#                               when it isn't one.
#   X-Frame-Options            "Never show this site inside another site's
#                               frame" - blocks clickjacking, where a fake
#                               page is laid over the real one to steal clicks.
#   Referrer-Policy            "When following a link away from here, only say
#                               which site you came from, not the full page."
#   Content-Security-Policy    A deliberately small one for now: no framing,
#                               no plugins (<object>), and no <base> tag
#                               tricks. It does NOT yet list which scripts
#                               may load - that stricter rule needs testing
#                               against the Plaid bank pop-up first, so it
#                               is left for a later change.

resource "aws_cloudfront_response_headers_policy" "security" {
  name    = "${var.project_name}-${var.environment}-security-headers"
  comment = "Browser security headers for the ${var.environment} frontend"

  security_headers_config {
    strict_transport_security {
      access_control_max_age_sec = 31536000 # one year, in seconds
      include_subdomains         = false    # other eliadablah.com sites decide for themselves
      override                   = true
    }

    content_type_options {
      override = true
    }

    frame_options {
      frame_option = "DENY"
      override     = true
    }

    referrer_policy {
      referrer_policy = "strict-origin-when-cross-origin"
      override        = true
    }

    content_security_policy {
      content_security_policy = "frame-ancestors 'none'; object-src 'none'; base-uri 'self'"
      override                = true
    }
  }
}
