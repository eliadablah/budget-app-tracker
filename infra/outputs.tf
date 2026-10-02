# infra/outputs.tf
# What: values later pieces of this stack will need - mainly the Lambda's IAM
#       policy, which has to know the table's ARN to be allowed to read/write it.

output "dynamodb_table_name" {
  description = "Name of the DynamoDB table."
  value       = aws_dynamodb_table.app.name
}

output "dynamodb_table_arn" {
  description = "ARN of the DynamoDB table."
  value       = aws_dynamodb_table.app.arn
}

output "lambda_role_arn" {
  description = "ARN of the IAM role the Lambda function assumes. The Lambda resource (next step) will reference this."
  value       = aws_iam_role.lambda_exec.arn
}

output "ecr_repository_url" {
  description = "URL of the ECR repository. Used by `docker push` and later by the Lambda resource."
  value       = aws_ecr_repository.backend.repository_url
}

output "lambda_function_name" {
  description = "Name of the Lambda function. API Gateway (next build-order step) will reference this."
  value       = aws_lambda_function.backend.function_name
}

output "lambda_function_arn" {
  description = "ARN of the Lambda function."
  value       = aws_lambda_function.backend.arn
}

output "api_url" {
  description = "Public URL for the API. This is the address your frontend (or curl, or a browser) will call."
  value       = aws_apigatewayv2_stage.default.invoke_url
}

output "cognito_user_pool_id" {
  description = "ID of the Cognito user pool. Needed to create your own login account."
  value       = aws_cognito_user_pool.main.id
}

output "cognito_app_client_id" {
  description = "ID of the Cognito app client. The frontend uses this to talk to Cognito (not a secret - safe to put in frontend code)."
  value       = aws_cognito_user_pool_client.frontend.id
}

output "frontend_bucket_name" {
  description = "Name of the S3 bucket holding the built frontend. Used by `aws s3 sync` to upload it."
  value       = aws_s3_bucket.frontend.id
}

output "frontend_url" {
  description = "The real, permanent public URL for the app - this is the one to actually open and bookmark."
  value       = "https://${var.frontend_domain_name}"
}

output "frontend_cloudfront_domain" {
  description = "CloudFront's own generated domain - also works, and is useful while DNS is still propagating."
  value       = aws_cloudfront_distribution.frontend.domain_name
}
