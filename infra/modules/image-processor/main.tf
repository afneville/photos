# ECR Repository for Lambda container
resource "aws_ecr_repository" "image_processor_repo" {
  name                 = var.ecr_repository_name
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = var.tags
}

# ECR authorization token for Docker provider
data "aws_ecr_authorization_token" "token" {}

# Docker provider configuration for ECR
provider "docker" {
  registry_auth {
    address  = data.aws_ecr_authorization_token.token.proxy_endpoint
    username = data.aws_ecr_authorization_token.token.user_name
    password = data.aws_ecr_authorization_token.token.password
  }
}

# Build placeholder Lambda container image
resource "docker_image" "placeholder_lambda" {
  name = "placeholder-lambda:latest"

  build {
    context    = "${path.module}/${var.dockerfile_context_path}"
    dockerfile = "Dockerfile"
  }

  depends_on = [aws_ecr_repository.image_processor_repo]
}

# Tag and push placeholder image to ECR
resource "docker_tag" "placeholder_lambda" {
  source_image = docker_image.placeholder_lambda.name
  target_image = "${aws_ecr_repository.image_processor_repo.repository_url}:latest"
}

resource "docker_registry_image" "placeholder_lambda" {
  name = docker_tag.placeholder_lambda.target_image

  depends_on = [
    docker_tag.placeholder_lambda,
    aws_ecr_repository.image_processor_repo
  ]
}

# ECR Lifecycle policy to manage image versions
resource "aws_ecr_lifecycle_policy" "image_processor_lifecycle" {
  repository = aws_ecr_repository.image_processor_repo.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep last 10 images"
        selection = {
          tagStatus   = "any"
          countType   = "imageCountMoreThan"
          countNumber = 10
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}

# IAM role for Lambda
resource "aws_iam_role" "image_processor_role" {
  name = "${var.lambda_function_name}-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })

  tags = var.tags
}

# IAM policy for Lambda
resource "aws_iam_role_policy" "image_processor_policy" {
  name = "${var.lambda_function_name}-policy"
  role = aws_iam_role.image_processor_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject"
        ]
        Resource = "${var.staging_bucket_arn}/*"
      },
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject"
        ]
        Resource = "${var.serving_bucket_arn}/*"
      },
      {
        Effect = "Allow"
        Action = [
          "dynamodb:UpdateItem"
        ]
        Resource = var.dynamodb_table_arn
      }
    ]
  })
}

# Lambda function using container image
resource "aws_lambda_function" "image_processor" {
  function_name = var.lambda_function_name
  role          = aws_iam_role.image_processor_role.arn
  package_type  = "Image"
  image_uri     = "${aws_ecr_repository.image_processor_repo.repository_url}:latest"
  timeout       = var.lambda_timeout
  memory_size   = var.lambda_memory_size

  environment {
    variables = {
      SERVING_BUCKET      = var.serving_bucket_name
      DYNAMODB_TABLE_NAME = var.dynamodb_table_name
    }
  }

  depends_on = [
    aws_iam_role_policy.image_processor_policy,
    aws_cloudwatch_log_group.image_processor_logs,
    docker_registry_image.placeholder_lambda
  ]

  # Ignore changes to image_uri since we'll update it via CLI
  lifecycle {
    ignore_changes = [image_uri]
  }

  tags = var.tags
}

# CloudWatch Log Group for Lambda
resource "aws_cloudwatch_log_group" "image_processor_logs" {
  name              = "/aws/lambda/${var.lambda_function_name}"
  retention_in_days = var.log_retention_days

  tags = var.tags
}

# S3 bucket notification to trigger Lambda
resource "aws_s3_bucket_notification" "staging_bucket_notification" {
  bucket = var.staging_bucket_name

  lambda_function {
    lambda_function_arn = aws_lambda_function.image_processor.arn
    events              = ["s3:ObjectCreated:*"]
  }

  depends_on = [aws_lambda_permission.s3_invoke_lambda]
}

# Permission for S3 to invoke Lambda
resource "aws_lambda_permission" "s3_invoke_lambda" {
  statement_id  = "AllowS3Invoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.image_processor.function_name
  principal     = "s3.amazonaws.com"
  source_arn    = var.staging_bucket_arn
}