variable "metadata_table_name" {
  description = "Name of the DynamoDB table for photo gallery metadata"
  type        = string
}

variable "hash_key_attribute" {
  description = "Hash key attribute name for the DynamoDB table"
  type        = string
  default     = "photoGalleryId"
}

variable "range_key_attribute" {
  description = "Range key attribute name for the DynamoDB table"
  type        = string
  default     = "photoArrayId"
}

variable "staging_bucket_name" {
  description = "Name of the S3 bucket for uploading images"
  type        = string
}

variable "cloudfront_enabled" {
  description = "Serve images with CloudFront"
  type        = bool
  default     = false
}

variable "processed_bucket_name" {
  description = "Name of the S3 bucket for processed images"
  type        = string
}

variable "hosted_zone" {
  description = "Route53 hosted zone name - only used when cloudfront_enabled is true"
  type        = string
  default     = ""
}

variable "domain_names" {
  description = "List of domain names for CloudFront aliases - only used when cloudfront_enabled is true"
  type        = list(string)
  default     = []
}

variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default     = {}
}
