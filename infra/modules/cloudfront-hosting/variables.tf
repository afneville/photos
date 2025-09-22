variable "bucket_name" {
  description = "Name of the S3 bucket for serving content"
  type        = string
}

variable "web_app_lambda_image_uri" {
  description = "ECR image URI for the containerized web application Lambda (defaults to created ECR repo)"
  type        = string
  default     = ""
}

variable "web_app_environment_variables" {
  description = "Environment variables for the web application Lambda"
  type        = map(string)
  default     = {}
}

variable "domain_names" {
  description = "List of domain names for CloudFront aliases"
  type        = list(string)
  default     = []
}


variable "hosted_zone" {
  description = "Route53 hosted zone name for creating DNS records"
  type        = string
  default     = ""
}


variable "dynamodb_table_arn" {
  description = "ARN of the DynamoDB table for Lambda permissions"
  type        = string
}

variable "web_app_timeout" {
  description = "Timeout for the web app Lambda function in seconds"
  type        = number
  default     = 60
}

variable "web_app_memory_size" {
  description = "Memory size for the web app Lambda function in MB"
  type        = number
  default     = 1024
}


variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default     = {}
}