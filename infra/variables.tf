variable "project_id" {
  description = "The GCP project ID"
  type        = string
  default     = env("GOOGLE_CLOUD_PROJECT")

  validation {
    condition     = length(var.project_id) > 0
    error_message = "project_id must be set or the GOOGLE_CLOUD_PROJECT environment variable must be defined."
  }
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

variable "environment" {
  description = "Deployment environment identifier, e.g. prod, e2e"
  type        = string
  default     = "prod"         # keeps prod plans = zero-diff
}

variable "google_oauth_client_id" {
  description = "OAuth client ID for Google sign-in"
  type        = string
}

variable "google_oauth_client_secret" {
  description = "OAuth client secret for Google sign-in"
  type        = string
}

variable "gis_one_tap_client_id" {
  description = "Optional GIS One-Tap client ID"
  type        = string
  default     = ""
}
