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
