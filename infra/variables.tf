variable "metadata_table_name" {
  type    = string
  default = "PhotoGallery"
}

variable "hash_key_attribute" {
  type    = string
  default = "photoGalleryId"
}

variable "range_key_attribute" {
  type    = string
  default = "photoArrayId"
}
