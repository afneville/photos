terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  backend "s3" {}
  # pass with -backend-config to tf init
  # bucket         = ""
  # key            = ""
  # dynamodb_table = ""
  # region         = ""
}

provider "aws" {
  region = "eu-west-2"
  default_tags {
    tags = {}
  }
}
