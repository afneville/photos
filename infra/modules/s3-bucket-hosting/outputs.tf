output "bucket_name" {
  description = "Name of the S3 hosting bucket"
  value       = aws_s3_bucket.hosting_bucket.bucket
}

output "bucket_arn" {
  description = "ARN of the S3 hosting bucket"
  value       = aws_s3_bucket.hosting_bucket.arn
}

output "website_endpoint" {
  description = "S3 website endpoint"
  value       = aws_s3_bucket_website_configuration.hosting_website.website_endpoint
}