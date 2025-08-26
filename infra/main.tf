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

module "cloud_functions" {
  source = "./modules/cloud-functions"

  project_id              = var.project_id
  region                  = var.region
  environment             = var.environment
  cloud_functions_runtime = var.cloud_functions_runtime
  https_security_level    = var.https_security_level
}

module "static_site" {
  source = "./modules/static-site"

  project_id              = var.project_id
  region                  = var.region
  irien_bucket_location   = var.irien_bucket_location
  static_site_bucket_name = var.static_site_bucket_name
  service_account_email   = module.cloud_functions.runtime_service_account_email
  firebase_web_app_config = local.firebase_web_app_config
}

module "firestore" {
  source = "./modules/firestore"

  project_id                    = var.project_id
  region                        = var.region
  runtime_service_account_email = module.cloud_functions.runtime_service_account_email
}

module "load_balancer" {
  source = "./modules/load-balancer"

  project_id                    = var.project_id
  project_number                = data.google_project.project.number
  environment                   = var.environment
  dendrite_static_bucket_name   = module.static_site.dendrite_static_bucket_name
  runtime_service_account_email = module.cloud_functions.runtime_service_account_email
}
