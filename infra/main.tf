terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.6"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "~> 5.6"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

provider "google-beta" {
  project = var.project_id
  region  = var.region
}

data "google_project" "project" {
  project_id = var.project_id
}

resource "google_storage_bucket" "irien_bucket" {
  name     = "irien-hello-world-${var.project_id}"
  location = var.irien_bucket_location
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

module "cloud_functions" {
  source                  = "./modules/cloud-functions"
  project_id              = var.project_id
  region                  = var.region
  environment             = var.environment
  cloud_functions_runtime = var.cloud_functions_runtime
  https_security_level    = var.https_security_level
}

module "firestore" {
  source                        = "./modules/firestore"
  project_id                    = var.project_id
  region                        = var.region
  runtime_service_account_email = module.cloud_functions.runtime_service_account_email
}

module "static_site" {
  source                        = "./modules/static-site"
  static_site_bucket_name       = var.static_site_bucket_name
  region                        = var.region
  runtime_service_account_email = module.cloud_functions.runtime_service_account_email
  firebase_web_app_config       = local.firebase_web_app_config
}

module "load_balancer" {
  source                        = "./modules/load-balancer"
  project_id                    = var.project_id
  environment                   = var.environment
  static_bucket_name            = module.static_site.bucket_name
  runtime_service_account_email = module.cloud_functions.runtime_service_account_email
}
