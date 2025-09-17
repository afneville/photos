resource "aws_dynamodb_table" "gallery_metadata_table" {
  name         = var.metadata_table_name
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = var.hash_key_attribute
  range_key    = var.range_key_attribute

  attribute {
    name = var.hash_key_attribute
    type = "S"
  }

  attribute {
    name = var.range_key_attribute
    type = "S"
  }

  tags = var.tags
}

resource "aws_s3_bucket" "staging_bucket" {
  bucket = var.staging_bucket_name

  tags = var.tags
}

resource "aws_s3_bucket_public_access_block" "staging_bucket_pab" {
  bucket = aws_s3_bucket.staging_bucket.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_cors_configuration" "staging_bucket_cors" {
  bucket = aws_s3_bucket.staging_bucket.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["PUT", "POST", "GET"]
    allowed_origins = var.cors_allowed_origins
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

module "cloudfront_hosting" {
  count  = var.cloudfront_enabled ? 1 : 0
  source = "../../../../cached-bucket-tf"
  providers = {
    aws.n-virginia = aws.n-virginia
  }

  bucket_name  = var.processed_bucket_name
  hosted_zone  = var.hosted_zone
  domain_names = var.domain_names
}

module "bucket_hosting" {
  count  = var.cloudfront_enabled ? 0 : 1
  source = "../s3-bucket-hosting"

  bucket_name = var.processed_bucket_name
  tags        = var.tags
}

# ECR Repository for Lambda container
resource "aws_ecr_repository" "image_processor_repo" {
  name                 = "photo-gallery-image-processor"
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
    context = "${path.module}/../../../serverless/placeholder"
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
  name = "photo-gallery-image-processor-role"

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
  name = "photo-gallery-image-processor-policy"
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
        Resource = "${aws_s3_bucket.staging_bucket.arn}/*"
      },
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject"
        ]
        Resource = "${var.cloudfront_enabled ? module.cloudfront_hosting[0].bucket_arn : module.bucket_hosting[0].bucket_arn}/*"
      },
      {
        Effect = "Allow"
        Action = [
          "dynamodb:UpdateItem"
        ]
        Resource = aws_dynamodb_table.gallery_metadata_table.arn
      }
    ]
  })
}

# Lambda function using container image
resource "aws_lambda_function" "image_processor" {
  function_name = "photo-gallery-image-processor"
  role         = aws_iam_role.image_processor_role.arn
  package_type = "Image"
  image_uri    = "${aws_ecr_repository.image_processor_repo.repository_url}:latest"
  timeout      = 60
  memory_size  = 1024

  environment {
    variables = {
      SERVING_BUCKET      = var.processed_bucket_name
      DYNAMODB_TABLE_NAME = aws_dynamodb_table.gallery_metadata_table.name
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
  name              = "/aws/lambda/photo-gallery-image-processor"
  retention_in_days = 7

  tags = var.tags
}

# S3 bucket notification to trigger Lambda
resource "aws_s3_bucket_notification" "staging_bucket_notification" {
  bucket = aws_s3_bucket.staging_bucket.id

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
  source_arn    = aws_s3_bucket.staging_bucket.arn
}
