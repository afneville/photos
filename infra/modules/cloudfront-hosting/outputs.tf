output "bucket_arn" {
  description = "ARN of the processed images bucket"
  value       = aws_s3_bucket.processed_bucket.arn
}

output "bucket_name" {
  description = "Name of the processed images bucket"
  value       = aws_s3_bucket.processed_bucket.bucket
}

output "cloudfront_distribution_id" {
  description = "ID of the CloudFront distribution"
  value       = aws_cloudfront_distribution.main.id
}

output "cloudfront_domain_name" {
  description = "Domain name of the CloudFront distribution"
  value       = aws_cloudfront_distribution.main.domain_name
}

output "cloudfront_distribution_arn" {
  description = "ARN of the CloudFront distribution"
  value       = aws_cloudfront_distribution.main.arn
}

output "web_app_lambda_function_name" {
  description = "Name of the web app Lambda function"
  value       = aws_lambda_function.web_app.function_name
}

output "web_app_lambda_function_url" {
  description = "Function URL of the web app Lambda"
  value       = aws_lambda_function_url.web_app_url.function_url
}

output "web_app_lambda_arn" {
  description = "ARN of the web app Lambda function"
  value       = aws_lambda_function.web_app.arn
}

output "route53_records" {
  description = "Route53 records created for CloudFront"
  value       = var.domain_names
}

output "website_endpoint" {
  description = "Primary endpoint for accessing the website"
  value       = "https://${var.domain_names[0]}"
}

output "acm_certificate_arn" {
  description = "ARN of the ACM certificate"
  value       = aws_acm_certificate.acm_certificate.arn
}

output "acm_certificate_validation_arn" {
  description = "ARN of the validated ACM certificate"
  value       = aws_acm_certificate_validation.certificate_validation.certificate_arn
}

output "web_app_ecr_repository_url" {
  description = "URL of the ECR repository for web app container images"
  value       = module.web_app_ecr.repository_url
}

output "web_app_ecr_repository_name" {
  description = "Name of the ECR repository for web app container images"
  value       = module.web_app_ecr.repository_name
}

output "web_app_ecr_repository_arn" {
  description = "ARN of the ECR repository for web app container images"
  value       = module.web_app_ecr.repository_arn
}