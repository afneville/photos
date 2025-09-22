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
  tags   = var.tags
}

resource "aws_s3_bucket_public_access_block" "staging_bucket_pab" {
  bucket                  = aws_s3_bucket.staging_bucket.id
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
  source = "../cloudfront-hosting"
  providers = {
    aws.n-virginia = aws.n-virginia
  }

  bucket_name                   = var.processed_bucket_name
  web_app_lambda_image_uri      = var.web_app_lambda_image_uri
  web_app_environment_variables = var.web_app_environment_variables
  domain_names                  = var.domain_names
  hosted_zone                   = var.hosted_zone
  dynamodb_table_arn            = aws_dynamodb_table.gallery_metadata_table.arn
  tags                          = var.tags
}

module "bucket_hosting" {
  count  = var.cloudfront_enabled ? 0 : 1
  source = "../s3-bucket-hosting"

  bucket_name = var.processed_bucket_name
  tags        = var.tags
}

module "image_processor" {
  source = "../image-processor"

  staging_bucket_name = var.staging_bucket_name
  staging_bucket_arn  = aws_s3_bucket.staging_bucket.arn
  serving_bucket_name = var.processed_bucket_name
  serving_bucket_arn  = var.cloudfront_enabled ? module.cloudfront_hosting[0].bucket_arn : module.bucket_hosting[0].bucket_arn
  dynamodb_table_name = aws_dynamodb_table.gallery_metadata_table.name
  dynamodb_table_arn  = aws_dynamodb_table.gallery_metadata_table.arn
  tags                = var.tags
}

# Cognito User Pool for JWT authentication
resource "aws_cognito_user_pool" "photo_gallery_user_pool" {
  name = var.cognito_user_pool_name

  # Password policy
  password_policy {
    minimum_length    = 8
    require_lowercase = true
    require_numbers   = true
    require_symbols   = true
    require_uppercase = true
  }

  # Username attributes
  username_attributes = ["email"]

  # Auto-verified attributes
  auto_verified_attributes = ["email"]

  # Account recovery settings
  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }

  # Email verification message
  verification_message_template {
    default_email_option = "CONFIRM_WITH_CODE"
    email_subject        = "Verify your photo gallery account"
    email_message        = "Your verification code is {####}"
  }

  tags = var.tags
}

# Cognito User Pool Client for JWT tokens
resource "aws_cognito_user_pool_client" "photo_gallery_client" {
  name            = "${var.cognito_user_pool_name}-client"
  user_pool_id    = aws_cognito_user_pool.photo_gallery_user_pool.id
  generate_secret = false

  # Token validity
  access_token_validity  = 60 # minutes
  id_token_validity      = 60 # minutes
  refresh_token_validity = 30 # days

  token_validity_units {
    access_token  = "minutes"
    id_token      = "minutes"
    refresh_token = "days"
  }

  # Explicit auth flows
  explicit_auth_flows = [
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_USER_SRP_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH"
  ]

  # Prevent user existence errors
  prevent_user_existence_errors = "ENABLED"
}
