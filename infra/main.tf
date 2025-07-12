terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = "europe-west1"
}

variable "project_id" {
  description = "The GCP project ID"
  type        = string
  default     = "irien-465710"
}

resource "google_storage_bucket" "irien_bucket" {
  name     = "irien-hello-world-${var.project_id}"
  location = "EU"
}

resource "google_storage_bucket_object" "hello_world" {
  name   = "hello-world.txt"
  bucket = google_storage_bucket.irien_bucket.name
  source = "${path.module}/hello-world.txt"
}
