terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    docker = {
      source  = "kreuzwerker/docker"
      version = "~> 3.0"
    }
  }
  backend "s3" {}
}

provider "aws" {
  region = "eu-west-2"
  default_tags {
    tags = {
      Environment = "test"
      Project     = "photo-gallery"
    }
  }
}

provider "aws" {
  alias  = "n-virginia"
  region = "us-east-1"
  default_tags {
    tags = {}
  }
}

data "aws_ecr_authorization_token" "token" {}

provider "docker" {
  registry_auth {
    address  = data.aws_ecr_authorization_token.token.proxy_endpoint
    username = data.aws_ecr_authorization_token.token.user_name
    password = data.aws_ecr_authorization_token.token.password
  }
}

module "photo_gallery" {
  source = "../../modules/photo-gallery"
  providers = {
    aws.n-virginia = aws.n-virginia
    docker         = docker
  }

  cloudfront_enabled                  = true
  metadata_table_name                 = "PhotoGallery"
  staging_bucket_name                 = "staging.photos.afneville.com"
  processed_bucket_name               = "serving.photos.afneville.com"
  cors_allowed_origins                = ["*"]
  cognito_user_pool_name              = "PhotoGallery"
  domain_names                        = ["photos.afneville.com"]
  hosted_zone                         = "afneville.com"
  photo_gallery_id                    = "prod-gallery"
  aws_region                          = "eu-west-2"
  image_processor_function_name       = "photo-gallery-image-processor"
  image_processor_ecr_repository_name = "photo-gallery-image-processor"
  tags = {
    Environment = "prod"
    Project     = "photo-gallery"
  }
}

output "dynamodb_table_name" {
  value = module.photo_gallery.table_name
}

output "staging_bucket_name" {
  value = module.photo_gallery.staging_bucket_name
}

output "processed_bucket_name" {
  value = module.photo_gallery.processed_bucket_name
}

output "image_serving_endpoint" {
  value = module.photo_gallery.processed_images_endpoint
}

output "ecr_repository_url" {
  value = module.photo_gallery.ecr_repository_url
}

output "lambda_function_name" {
  value = module.photo_gallery.lambda_function_name
}

output "image_processor_ecr_repository_name" {
  value = module.photo_gallery.image_processor_ecr_repository_name
}

output "cognito_user_pool_id" {
  value = module.photo_gallery.cognito_user_pool_id
}

output "cognito_user_pool_client_id" {
  value = module.photo_gallery.cognito_user_pool_client_id
}

output "cognito_user_pool_endpoint" {
  value = module.photo_gallery.cognito_user_pool_endpoint
}

output "web_app_ecr_repository_url" {
  value = module.photo_gallery.web_app_ecr_repository_url
}

output "web_app_lambda_function_name" {
  value = module.photo_gallery.web_app_lambda_function_name
}

output "cloudfront_distribution_id" {
  value = module.photo_gallery.cloudfront_distribution_id
}

