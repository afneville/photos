resource "aws_s3_bucket" "processed_bucket" {
  bucket = var.bucket_name
  tags   = var.tags
}

resource "aws_s3_bucket_public_access_block" "processed_bucket_pab" {
  bucket                  = aws_s3_bucket.processed_bucket.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_cloudfront_origin_access_control" "s3_oac" {
  name                              = "${var.bucket_name}-oac"
  description                       = "OAC for ${var.bucket_name}"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_s3_bucket_policy" "processed_bucket_policy" {
  bucket = aws_s3_bucket.processed_bucket.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCloudFrontServicePrincipal"
        Effect = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.processed_bucket.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.main.arn
          }
        }
      }
    ]
  })

  depends_on = [aws_s3_bucket_public_access_block.processed_bucket_pab]
}

module "web_app_ecr" {
  source = "../ecr-repository"
  providers = {
    docker = docker
  }

  repository_name             = "photo-gallery-web-app"
  lifecycle_policy_keep_count = 10
  create_placeholder_image    = true
  dockerfile_context_path     = "../../../serverless/placeholder"
  tags                        = var.tags
}

resource "aws_iam_role" "web_app_lambda_role" {
  name = "photo-gallery-web-app-lambda-role"

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

resource "aws_iam_role_policy" "web_app_lambda_policy" {
  name = "photo-gallery-web-app-lambda-policy"
  role = aws_iam_role.web_app_lambda_role.id

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
        Resource = "${aws_s3_bucket.processed_bucket.arn}/*"
      },
      {
        Effect = "Allow"
        Action = [
          "dynamodb:Query",
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem"
        ]
        Resource = var.dynamodb_table_arn
      }
    ]
  })
}

resource "aws_lambda_function" "web_app" {
  function_name = "photo-gallery-web-app"
  role          = aws_iam_role.web_app_lambda_role.arn
  package_type  = "Image"
  image_uri     = var.web_app_lambda_image_uri != "" ? var.web_app_lambda_image_uri : module.web_app_ecr.repository_uri_with_tag
  timeout       = var.web_app_timeout
  memory_size   = var.web_app_memory_size

  environment {
    variables = merge(var.web_app_environment_variables, {
      STAGING_BUCKET       = var.staging_bucket_name
      CLOUD_REGION        = var.aws_region
      DYNAMODB_TABLE      = var.dynamodb_table_name
      PHOTO_GALLERY_ID    = var.photo_gallery_id
      IMAGE_DOMAIN        = "https://${var.domain_names[0]}"
      COGNITO_USER_POOL_ID = var.cognito_user_pool_id
      COGNITO_CLIENT_ID   = var.cognito_user_pool_client_id
      ORIGIN              = "https://${var.domain_names[0]}"
    })
  }

  depends_on = [
    aws_iam_role_policy.web_app_lambda_policy,
    aws_cloudwatch_log_group.web_app_logs,
    module.web_app_ecr
  ]

  tags = var.tags
}

resource "aws_cloudwatch_log_group" "web_app_logs" {
  name              = "/aws/lambda/photo-gallery-web-app"
  retention_in_days = 7

  tags = var.tags
}

resource "aws_lambda_function_url" "web_app_url" {
  function_name      = aws_lambda_function.web_app.function_name
  authorization_type = "NONE"

  cors {
    allow_credentials = false
    allow_origins     = ["*"]
    allow_methods     = ["*"]
    allow_headers     = ["*"]
    expose_headers    = ["*"]
    max_age           = 86400
  }
}

resource "aws_cloudfront_origin_request_policy" "lambda_policy" {
  name = "lambda-origin-request-policy"

  headers_config {
    header_behavior = "allExcept"
    headers {
      items = ["host"]
    }
  }

  query_strings_config {
    query_string_behavior = "all"
  }

  cookies_config {
    cookie_behavior = "all"
  }
}

resource "aws_cloudfront_cache_policy" "lambda_cache_policy" {
  name = "lambda-cache-policy"

  parameters_in_cache_key_and_forwarded_to_origin {
    enable_accept_encoding_brotli = true
    enable_accept_encoding_gzip   = true

    headers_config {
      header_behavior = "none"
    }

    query_strings_config {
      query_string_behavior = "none"
    }

    cookies_config {
      cookie_behavior = "none"
    }
  }

  default_ttl = 0
  max_ttl     = 31536000
  min_ttl     = 0
}

resource "aws_cloudfront_cache_policy" "lambda_root_cache_policy" {
  name = "lambda-root-cache-policy"

  parameters_in_cache_key_and_forwarded_to_origin {
    enable_accept_encoding_brotli = true
    enable_accept_encoding_gzip   = true

    headers_config {
      header_behavior = "none"
    }

    query_strings_config {
      query_string_behavior = "none"
    }

    cookies_config {
      cookie_behavior = "none"
    }
  }

  default_ttl = 2592000
  max_ttl     = 31536000
  min_ttl     = 86400
}

resource "aws_acm_certificate" "acm_certificate" {
  provider                  = aws.n-virginia
  domain_name               = var.domain_names[0]
  subject_alternative_names = length(var.domain_names) > 1 ? slice(var.domain_names, 1, length(var.domain_names)) : []
  validation_method         = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = var.tags
}

resource "aws_route53_record" "domain_validation_options" {
  provider = aws.n-virginia
  for_each = {
    for dvo in aws_acm_certificate.acm_certificate.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = data.aws_route53_zone.main.zone_id
}

resource "aws_acm_certificate_validation" "certificate_validation" {
  provider                = aws.n-virginia
  certificate_arn         = aws_acm_certificate.acm_certificate.arn
  validation_record_fqdns = [for record in aws_route53_record.domain_validation_options : record.fqdn]

  timeouts {
    create = "5m"
  }
}

resource "aws_cloudfront_distribution" "main" {
  origin {
    domain_name              = aws_s3_bucket.processed_bucket.bucket_regional_domain_name
    origin_id                = "S3-${var.bucket_name}"
    origin_access_control_id = aws_cloudfront_origin_access_control.s3_oac.id
  }

  origin {
    domain_name = replace(replace(aws_lambda_function_url.web_app_url.function_url, "https://", ""), "/", "")
    origin_id   = "Lambda-WebApp"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  enabled         = true
  is_ipv6_enabled = true
  aliases         = var.domain_names

  default_cache_behavior {
    allowed_methods            = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods             = ["GET", "HEAD"]
    target_origin_id           = "Lambda-WebApp"
    compress                   = true
    viewer_protocol_policy     = "redirect-to-https"
    origin_request_policy_id   = aws_cloudfront_origin_request_policy.lambda_policy.id
    cache_policy_id            = aws_cloudfront_cache_policy.lambda_cache_policy.id
  }

  ordered_cache_behavior {
    path_pattern           = "/photos/*"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "S3-${var.bucket_name}"
    compress               = true
    viewer_protocol_policy = "redirect-to-https"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    min_ttl     = 86400
    default_ttl = 2592000    # 30 days
    max_ttl     = 31536000   # 1 year
  }

  ordered_cache_behavior {
    path_pattern           = "/_app/*"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "S3-${var.bucket_name}"
    compress               = true
    viewer_protocol_policy = "redirect-to-https"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    min_ttl     = 86400
    default_ttl = 2592000    # 30 days
    max_ttl     = 31536000   # 1 year
  }

  ordered_cache_behavior {
    path_pattern             = "/"
    allowed_methods          = ["GET", "HEAD"]
    cached_methods           = ["GET", "HEAD"]
    target_origin_id         = "Lambda-WebApp"
    compress                 = true
    viewer_protocol_policy   = "redirect-to-https"
    origin_request_policy_id = aws_cloudfront_origin_request_policy.lambda_policy.id
    cache_policy_id          = aws_cloudfront_cache_policy.lambda_root_cache_policy.id
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate.acm_certificate.arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  tags = var.tags

  depends_on = [aws_acm_certificate_validation.certificate_validation]
}

data "aws_route53_zone" "main" {
  name = var.hosted_zone
}

resource "aws_route53_record" "cloudfront_alias" {
  count   = length(var.domain_names)
  zone_id = data.aws_route53_zone.main.zone_id
  name    = var.domain_names[count.index]
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.main.domain_name
    zone_id                = aws_cloudfront_distribution.main.hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "cloudfront_alias_ipv6" {
  count   = length(var.domain_names)
  zone_id = data.aws_route53_zone.main.zone_id
  name    = var.domain_names[count.index]
  type    = "AAAA"

  alias {
    name                   = aws_cloudfront_distribution.main.domain_name
    zone_id                = aws_cloudfront_distribution.main.hosted_zone_id
    evaluate_target_health = false
  }
}

