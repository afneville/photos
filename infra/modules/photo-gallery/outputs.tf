output "table_name" {
  description = "Name of the DynamoDB table"
  value       = aws_dynamodb_table.gallery_metadata_table.name
}

output "processed_bucket_name" {
  description = "Name of the processed image bucket"
  value       = var.processed_bucket_name
}

output "staging_bucket_name" {
  description = "Name of the upload staging bucket"
  value       = var.staging_bucket_name
}

output "processed_images_endpoint" {
  description = "Endpoint for accessing processed images"
  value       = var.cloudfront_enabled ? module.cloudfront_hosting[0].website_endpoint : "http://${module.bucket_hosting[0].website_endpoint}"
}

output "cloudfront_distribution_id" {
  description = "ID of the CloudFront distribution (only when cloudfront_enabled is true)"
  value       = var.cloudfront_enabled ? module.cloudfront_hosting[0].cloudfront_distribution_id : null
}

output "cloudfront_domain_name" {
  description = "Domain name of the CloudFront distribution (only when cloudfront_enabled is true)"
  value       = var.cloudfront_enabled ? module.cloudfront_hosting[0].cloudfront_domain_name : null
}

output "web_app_lambda_function_name" {
  description = "Name of the web app Lambda function (only when cloudfront_enabled is true)"
  value       = var.cloudfront_enabled ? module.cloudfront_hosting[0].web_app_lambda_function_name : null
}

output "web_app_lambda_function_url" {
  description = "Function URL of the web app Lambda (only when cloudfront_enabled is true)"
  value       = var.cloudfront_enabled ? module.cloudfront_hosting[0].web_app_lambda_function_url : null
}

output "processed_bucket_arn" {
  description = "ARN of the processed images bucket"
  value       = var.cloudfront_enabled ? module.cloudfront_hosting[0].bucket_arn : module.bucket_hosting[0].bucket_arn
}

output "route53_records" {
  description = "Route53 records created for CloudFront (only when cloudfront_enabled is true and hosted_zone is specified)"
  value       = var.cloudfront_enabled ? module.cloudfront_hosting[0].route53_records : []
}

output "web_app_ecr_repository_url" {
  description = "URL of the ECR repository for web app container images (only when cloudfront_enabled is true)"
  value       = var.cloudfront_enabled ? module.cloudfront_hosting[0].web_app_ecr_repository_url : null
}

output "ecr_repository_url" {
  description = "URL of the ECR repository for Lambda container images"
  value       = module.image_processor.ecr_repository_url
}

output "lambda_function_name" {
  description = "Name of the image processor Lambda function"
  value       = module.image_processor.lambda_function_name
}

output "image_processor_ecr_repository_name" {
  description = "Name of the image processor ECR repository"
  value       = module.image_processor.ecr_repository_name
}

output "cognito_user_pool_id" {
  description = "ID of the Cognito User Pool"
  value       = aws_cognito_user_pool.photo_gallery_user_pool.id
}

output "cognito_user_pool_client_id" {
  description = "ID of the Cognito User Pool Client"
  value       = aws_cognito_user_pool_client.photo_gallery_client.id
}

output "cognito_user_pool_endpoint" {
  description = "Endpoint of the Cognito User Pool"
  value       = aws_cognito_user_pool.photo_gallery_user_pool.endpoint
}
