resource "aws_ecr_repository" "repository" {
  name                 = var.repository_name
  image_tag_mutability = var.image_tag_mutability

  image_scanning_configuration {
    scan_on_push = var.scan_on_push
  }

  tags = var.tags
}

resource "aws_ecr_lifecycle_policy" "lifecycle" {
  repository = aws_ecr_repository.repository.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep last ${var.lifecycle_policy_keep_count} images"
        selection = {
          tagStatus   = "any"
          countType   = "imageCountMoreThan"
          countNumber = var.lifecycle_policy_keep_count
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}

data "aws_ecr_authorization_token" "token" {
  count = var.create_placeholder_image ? 1 : 0
}

resource "docker_image" "placeholder" {
  count = var.create_placeholder_image ? 1 : 0
  name  = "placeholder-lambda:latest"

  build {
    context    = "${path.module}/${var.dockerfile_context_path}"
    dockerfile = "Dockerfile"
  }

  depends_on = [aws_ecr_repository.repository]
}

resource "docker_tag" "placeholder" {
  count        = var.create_placeholder_image ? 1 : 0
  source_image = docker_image.placeholder[0].name
  target_image = "${aws_ecr_repository.repository.repository_url}:latest"
}

resource "docker_registry_image" "placeholder" {
  count = var.create_placeholder_image ? 1 : 0
  name  = docker_tag.placeholder[0].target_image

  depends_on = [
    docker_tag.placeholder,
    aws_ecr_repository.repository
  ]
}
