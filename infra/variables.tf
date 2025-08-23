variable "metadata_table_name" {
  type = string
  default = "PhotoGallery"
}

variable "hash_key_attribute" {
  type = string
  default = "gallery"
}

variable "range_key_attribute" {
  type = string
  default = "photoCollection"
}
