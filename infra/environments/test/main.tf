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

provider "docker" {
  # Docker provider will be configured by the module
}

module "photo_gallery" {
  source = "../../modules/photo-gallery"
  providers = {
    aws.n-virginia = aws.n-virginia
  }

  cloudfront_enabled      = false
  metadata_table_name     = "PhotoGallery-test"
  staging_bucket_name     = "photo-gallery-staging-test"
  processed_bucket_name   = "photo-gallery-serving-test"
  cors_allowed_origins    = ["*"]
  tags = {
    Environment = "test"
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

