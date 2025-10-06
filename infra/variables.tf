variable "project_id" {
  description = "The GCP project ID"
  type        = string
}

variable "region" {
  description = "Default region for resources"
  type        = string
  default     = "europe-west1"
}

variable "playwright_image" {
  description = "Container image used by the Playwright Cloud Run job"
  type        = string
  default     = "gcr.io/cloudrun/hello"
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
  default     = "prod" # keeps prod plans = zero-diff
}

variable "github_run_id" {
  description = "GitHub Actions run identifier for tagging ephemeral resources"
  type        = string
  default     = ""
}

variable "enable_lb" {
  description = "Whether to provision the global HTTPS load balancer"
  type        = bool
  default     = true
}

variable "project_level_environment" {
  description = "Environment that manages project-level singleton resources"
  type        = string
  default     = "prod"
}

variable "database_id" {
  description = "Firestore database identifier to target (\"(default)\" or a named database)"
  type        = string
  default     = "(default)"
}

variable "create_default_firestore_database" {
  description = "Whether Terraform should attempt to create the default Firestore database when managing project-level resources"
  type        = bool
  default     = true
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

variable "identity_platform_authorized_domains" {
  description = "Allowed domains for project-level Identity Platform configuration"
  type        = list(string)
  default = [
    "dendritestories.co.nz",
    "www.dendritestories.co.nz",
    "mattheard.net",
    "localhost",
  ]
}
