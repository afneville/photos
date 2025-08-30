terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
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

module "photo_gallery" {
  source = "../../modules/photo-gallery"

  metadata_table_name = "PhotoGallery-test"
  
  tags = {
    Environment = "test"
    Project     = "photo-gallery"
  }
}

# Output the table name for use in application configuration
output "dynamodb_table_name" {
  value = module.photo_gallery.table_name
}