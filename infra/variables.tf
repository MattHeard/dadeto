variable "project_id" {
  description = "The GCP project ID"
  type        = string
}

variable "region" {
  description = "Default region for resources"
  type        = string
  default     = "europe-west1"
}

variable "irien_bucket_location" {
  description = "Location for the example irien bucket"
  type        = string
  default     = "EU"
}

variable "static_site_bucket_name" {
  description = "Bucket name for the Dendrite static website"
  type        = string
  default     = "www.dendritestories.co.nz"
}

variable "cloud_functions_runtime" {
  description = "Runtime to use for all Cloud Functions"
  type        = string
  default     = "nodejs20"
}

variable "https_security_level" {
  description = "Security level for HTTPS triggered functions"
  type        = string
  default     = "SECURE_ALWAYS"
}
