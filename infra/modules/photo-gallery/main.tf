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
