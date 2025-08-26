variable "project_id" {
  type = string
}

variable "region" {
  type = string
}

variable "irien_bucket_location" {
  type = string
}

variable "static_site_bucket_name" {
  type = string
}

variable "service_account_email" {
  type = string
}

variable "firebase_web_app_config" {
  type = any
}
