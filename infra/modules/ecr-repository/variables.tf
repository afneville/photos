variable "repository_name" {
  description = "Name of the ECR repository"
  type        = string
}

variable "image_tag_mutability" {
  description = "The tag mutability setting for the repository"
  type        = string
  default     = "MUTABLE"
}

variable "scan_on_push" {
  description = "Indicates whether images are scanned after being pushed to the repository"
  type        = bool
  default     = true
}

variable "lifecycle_policy_keep_count" {
  description = "Number of images to keep in the repository"
  type        = number
  default     = 10
}

variable "create_placeholder_image" {
  description = "Whether to create and push a placeholder image"
  type        = bool
  default     = true
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