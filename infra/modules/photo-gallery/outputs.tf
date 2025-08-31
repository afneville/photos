output "table_name" {
  description = "Name of the DynamoDB table"
  value       = aws_dynamodb_table.gallery_metadata_table.name
}

output "table_arn" {
  description = "ARN of the DynamoDB table"
  value       = aws_dynamodb_table.gallery_metadata_table.arn
}

output "staging_bucket_name" {
  description = "Name of the staging S3 bucket"
  value       = aws_s3_bucket.staging_bucket.bucket
}

output "staging_bucket_arn" {
  description = "ARN of the staging S3 bucket"
  value       = aws_s3_bucket.staging_bucket.arn
}