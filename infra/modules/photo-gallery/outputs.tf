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
  value       = var.cloudfront_enabled ? "https://${var.domain_names[0]}" : "http://${module.bucket_hosting[0].website_endpoint}"
}

output "ecr_repository_url" {
  description = "URL of the ECR repository for Lambda container images"
  value       = aws_ecr_repository.image_processor_repo.repository_url
}

output "lambda_function_name" {
  description = "Name of the Lambda function"
  value       = aws_lambda_function.image_processor.function_name
}
