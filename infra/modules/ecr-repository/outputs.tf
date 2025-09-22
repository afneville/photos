output "repository_url" {
  description = "URL of the ECR repository"
  value       = aws_ecr_repository.repository.repository_url
}

output "repository_name" {
  description = "Name of the ECR repository"
  value       = aws_ecr_repository.repository.name
}

output "repository_arn" {
  description = "ARN of the ECR repository"
  value       = aws_ecr_repository.repository.arn
}

output "registry_id" {
  description = "Registry ID of the ECR repository"
  value       = aws_ecr_repository.repository.registry_id
}

output "repository_uri_with_tag" {
  description = "Repository URI with latest tag for Lambda functions"
  value       = "${aws_ecr_repository.repository.repository_url}:latest"
}