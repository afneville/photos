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
  description = "Name of the S3 bucket for staging uploads"
  type        = string
}

variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default     = {}
}
