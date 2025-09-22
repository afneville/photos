variable "staging_bucket_name" {
  description = "Name of the S3 staging bucket (source for processing)"
  type        = string
}

variable "staging_bucket_arn" {
  description = "ARN of the S3 staging bucket"
  type        = string
}

variable "serving_bucket_name" {
  description = "Name of the S3 serving bucket (destination for processed images)"
  type        = string
}

variable "serving_bucket_arn" {
  description = "ARN of the S3 serving bucket"
  type        = string
}

variable "dynamodb_table_name" {
  description = "Name of the DynamoDB table for metadata updates"
  type        = string
}

variable "dynamodb_table_arn" {
  description = "ARN of the DynamoDB table"
  type        = string
}

variable "ecr_repository_name" {
  description = "Name of the ECR repository for Lambda container images"
  type        = string
  default     = "photo-gallery-image-processor"
}

variable "lambda_function_name" {
  description = "Name of the Lambda function"
  type        = string
  default     = "photo-gallery-image-processor"
}

variable "lambda_timeout" {
  description = "Timeout for the Lambda function in seconds"
  type        = number
  default     = 60
}

variable "lambda_memory_size" {
  description = "Memory size for the Lambda function in MB"
  type        = number
  default     = 1024
}

variable "log_retention_days" {
  description = "CloudWatch log retention period in days"
  type        = number
  default     = 7
}

variable "dockerfile_context_path" {
  description = "Path to the directory containing the Dockerfile for the placeholder image"
  type        = string
  default     = "../../../serverless/placeholder"
}

variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default     = {}
}