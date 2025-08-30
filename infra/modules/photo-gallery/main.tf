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