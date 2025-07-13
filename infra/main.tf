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
  region  = var.region
}

variable "project_id" {
  description = "The GCP project ID"
  type        = string
  default     = "irien-465710"
}

variable "region" {
  type    = string
  default = "europe-west1"
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

resource "google_storage_bucket_iam_member" "public_read_access" {
  bucket = google_storage_bucket.irien_bucket.name
  role   = "roles/storage.objectViewer"
  member = "allUsers"
}

resource "google_project_service" "firestore" {
  project = var.project_id
  service = "firestore.googleapis.com"
}

resource "google_project_service" "cloudfunctions" {
  project = var.project_id
  service = "cloudfunctions.googleapis.com"
}

resource "google_project_service" "cloudbuild" {
  project = var.project_id
  service = "cloudbuild.googleapis.com"
}

resource "google_firestore_database" "default" {
  project     = var.project_id
  name        = "(default)"
  location_id = "europe-west1"
  type        = "FIRESTORE_NATIVE"
  depends_on  = [google_project_service.firestore]
}

resource "google_project_iam_member" "firestore_access" {
  project = var.project_id
  role    = "roles/datastore.user"
  member  = "serviceAccount:terraform@${var.project_id}.iam.gserviceaccount.com"
}

resource "google_project_iam_member" "cloudfunctions_access" {
  project = var.project_id
  role    = "roles/cloudfunctions.developer"
  member  = "serviceAccount:terraform@${var.project_id}.iam.gserviceaccount.com"
}

resource "google_service_account" "default_runtime" {
  account_id   = "${var.project_id}-compute"
  project      = var.project_id
  display_name = "Default Compute Service Account"
}

resource "google_service_account_iam_member" "allow_terraform_to_impersonate_runtime" {
  service_account_id = google_service_account.default_runtime.name
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:terraform@${var.project_id}.iam.gserviceaccount.com"
}

resource "google_storage_bucket_object" "get_api_key_credit" {
  name   = "get-api-key-credit.zip"
  bucket = google_storage_bucket.irien_bucket.name
  source = "${path.module}/cloud-functions/get-api-key-credit/get-api-key-credit.zip"
}

resource "google_cloudfunctions2_function" "get_api_key_credit" {
  name     = "get-api-key-credit"
  location = var.region

  build_config {
    runtime     = "nodejs18"
    entry_point = "handler"
    source {
      storage_source {
        bucket = google_storage_bucket.irien_bucket.name
        object = google_storage_bucket_object.get_api_key_credit.name
      }
    }
  }

  service_config {
    available_memory   = "128Mi"
    timeout_seconds    = 60
    min_instance_count = 0
    service_account_email = google_service_account.default_runtime.email
  }

  event_trigger {
    event_type     = "google.cloud.functions.v2.eventTypes.http.request"
    trigger_region = var.region
  }

  depends_on = [
    google_project_service.cloudfunctions,
    google_project_service.cloudbuild,
    google_project_iam_member.cloudfunctions_access,
    google_service_account_iam_member.allow_terraform_to_impersonate_runtime
  ]
}
