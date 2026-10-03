# infra/apigateway.tf
# What: gives the Lambda a public web address. Without this, the only way to
#       reach it is AWS's own tools - nothing on the internet, including your
#       own future frontend, could reach it otherwise.
#
# Why "HTTP API" and not "REST API": API Gateway offers two flavors. HTTP API
# is newer, simpler, and cheaper - the right fit for a plain JSON-in,
# JSON-out backend like this one. REST API adds features (request
# validation, usage plans) this project doesn't need.

resource "aws_apigatewayv2_api" "backend" {
  name          = "${var.project_name}-${var.environment}"
  protocol_type = "HTTP"

  # CORS = the browser-enforced permission slip a webpage needs to fetch data
  # from a DIFFERENT address than the one it's running on. Without this, the
  # API works fine from the command line (curl, PowerShell) but every browser
  # silently blocks the frontend's fetch() calls - which is exactly what
  # "Failed to fetch" was.
  # allow_origins is deliberately an explicit list, not "*" (any website) -
  # the local dev server plus the real deployed domain, nothing else.
  cors_configuration {
    allow_origins = ["http://localhost:5173", "https://${var.frontend_domain_name}"]
    allow_methods = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
    # "authorization" added for the Cognito login token (step 7) - every
    # request now carries an Authorization header, which the browser's CORS
    # preflight check will block unless it's explicitly allow-listed here.
    allow_headers = ["content-type", "authorization"]
  }
}

# Tells API Gateway HOW to call the Lambda - as a direct "proxy," meaning the
# whole raw request is handed to the Lambda as-is, and the whole raw response
# is handed back as-is. The Lambda's own code (handler.ts) decides what to do
# with it.
resource "aws_apigatewayv2_integration" "lambda" {
  api_id                 = aws_apigatewayv2_api.backend.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.backend.invoke_arn
  payload_format_version = "2.0"
}

# The "ID checker" itself - tells API Gateway how to recognize a valid
# wristband (JWT token) from the Cognito user pool. "audience" (this app
# client) and "issuer" (this exact user pool) together mean a token from
# some OTHER Cognito pool, even a real one, is rejected - not just any
# valid-looking token.
resource "aws_apigatewayv2_authorizer" "cognito" {
  api_id           = aws_apigatewayv2_api.backend.id
  authorizer_type  = "JWT"
  identity_sources = ["$request.header.Authorization"]
  name             = "${var.project_name}-${var.environment}-cognito"

  jwt_configuration {
    audience = [aws_cognito_user_pool_client.frontend.id]
    issuer   = "https://cognito-idp.${var.aws_region}.amazonaws.com/${aws_cognito_user_pool.main.id}"
  }
}

# Every route the API answers, as "METHOD /path". Each one must have a
# matching `case` in backend/src/handler.ts. To-dos live under /todos so
# later features get their own address (/bills, /budget) instead of
# everything sharing "/". Adding a feature = adding its lines here.
locals {
  api_routes = [
    "GET /todos",
    "POST /todos",
    "PATCH /todos/{id}",
    "DELETE /todos/{id}",
    "PUT /todos/{id}/reminder",
    "DELETE /todos/{id}/reminder",
    "GET /settings/notifications",
    "PATCH /settings/notifications",
    "POST /settings/notifications/test",
    "GET /bills",
    "POST /bills",
    "PATCH /bills/{id}",
    "DELETE /bills/{id}",
    "POST /bills/{id}/payments",
    "POST /bills/suggestions/dismiss",
    "GET /budget",
    "PUT /budget",
    "POST /bank/link-token",
    "POST /bank/connections",
    "GET /bank/accounts",
    "GET /bank/transactions",
    "DELETE /bank/connections/{id}",
  ]
}

# Explicit routes - deliberately NOT "$default" (catch-everything).
# A "$default" route also catches OPTIONS requests, which browsers send as a
# CORS "preflight" check before certain requests (like our POST, which sends
# JSON). That preflight needs API Gateway's own automatic "yes, CORS is fine"
# reply - but only when nothing else already claims OPTIONS. "$default" was
# swallowing that preflight and forwarding it to the Lambda instead (which
# doesn't handle OPTIONS, so it replied 405 and browsers blocked the real
# request). Naming the exact methods here leaves OPTIONS unclaimed, so API
# Gateway's built-in CORS handling answers it automatically.
#
# authorization_type = "JWT" is the actual "lock the door" line - without it,
# a route accepts every request regardless of the authorizer existing.
# for_each stamps out one identical, locked route per entry in the list
# above, so a new route can never be added without the login check.
resource "aws_apigatewayv2_route" "api" {
  for_each = toset(local.api_routes)

  api_id             = aws_apigatewayv2_api.backend.id
  route_key          = each.value
  target             = "integrations/${aws_apigatewayv2_integration.lambda.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

# "$default" stage + auto_deploy means every change here goes live
# immediately, and the URL has no extra "/dev" or "/prod" segment in it -
# right fit for a single-environment personal project.
resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.backend.id
  name        = "$default"
  auto_deploy = true
}

# API Gateway and Lambda are separate AWS services - even though this API was
# built specifically to call this Lambda, AWS still requires an explicit
# permission slip proving it's allowed to. Scoped to only this one API, not
# "any API Gateway in the account."
resource "aws_lambda_permission" "apigw" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.backend.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.backend.execution_arn}/*/*"
}
