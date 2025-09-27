terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "~> 6.0"
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

locals {
  environment_suffix = var.environment == "prod" ? "" : "-${var.environment}"
  static_site_bucket_name = var.environment == "prod" ? var.static_site_bucket_name : "${var.environment}-${var.static_site_bucket_name}"
}

resource "google_storage_bucket" "irien_bucket" {
  name     = "irien-hello-world-${var.project_id}${local.environment_suffix}"
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

resource "google_storage_bucket" "dendrite_static" {
  name     = local.static_site_bucket_name
  location = var.region

  website {
    main_page_suffix = "index.html"
    not_found_page   = "404.html"
  }

  lifecycle {
    prevent_destroy = true # prod safety belt
  }
}


resource "google_storage_bucket_object" "dendrite_404" {
  name          = "404.html"
  bucket        = google_storage_bucket.dendrite_static.name
  source        = "${path.module}/404.html"
  content_type  = "text/html"
  cache_control = "no-store"
}

resource "google_storage_bucket_object" "dendrite_new_story" {
  name         = "new-story.html"
  bucket       = google_storage_bucket.dendrite_static.name
  source       = "${path.module}/new-story.html"
  content_type = "text/html"
}

resource "google_storage_bucket_object" "dendrite_new_page" {
  name         = "new-page.html"
  bucket       = google_storage_bucket.dendrite_static.name
  source       = "${path.module}/new-page.html"
  content_type = "text/html"
}

resource "google_storage_bucket_object" "dendrite_about" {
  name         = "about.html"
  bucket       = google_storage_bucket.dendrite_static.name
  source       = "${path.module}/about.html"
  content_type = "text/html"
}

resource "google_storage_bucket_object" "dendrite_manual" {
  name         = "manual.html"
  bucket       = google_storage_bucket.dendrite_static.name
  source       = "${path.module}/manual.html"
  content_type = "text/html"
}

resource "google_storage_bucket_object" "dendrite_mod" {
  name   = "mod.html"
  bucket = google_storage_bucket.dendrite_static.name
  content = templatefile("${path.module}/mod.html", {
    firebase_web_app_config = jsonencode(local.firebase_web_app_config)
  })
  content_type = "text/html"
}

resource "google_storage_bucket_object" "dendrite_google_auth_js" {
  name         = "googleAuth.js"
  bucket       = google_storage_bucket.dendrite_static.name
  source       = "${path.module}/googleAuth.js"
  content_type = "application/javascript"
}

resource "google_storage_bucket_object" "dendrite_moderate_js" {
  name         = "moderate.js"
  bucket       = google_storage_bucket.dendrite_static.name
  source       = "${path.module}/moderate.js"
  content_type = "application/javascript"
}

resource "google_storage_bucket_object" "dendrite_admin_html" {
  name         = "admin.html"
  bucket       = google_storage_bucket.dendrite_static.name
  source       = "${path.module}/admin.html"
  content_type = "text/html"
}

resource "google_storage_bucket_object" "dendrite_admin_js" {
  name         = "admin.js"
  bucket       = google_storage_bucket.dendrite_static.name
  source       = "${path.module}/admin.js"
  content_type = "application/javascript"
}

resource "google_storage_bucket_object" "dendrite_css" {
  name         = "dendrite.css"
  bucket       = google_storage_bucket.dendrite_static.name
  source       = "${path.module}/dendrite.css"
  content_type = "text/css"
}

resource "google_storage_bucket_iam_member" "dendrite_public_read_access" {
  bucket = google_storage_bucket.dendrite_static.name
  role   = "roles/storage.objectViewer"
  member = "allUsers"
}

resource "google_storage_bucket_iam_member" "dendrite_runtime_writer" {
  bucket = google_storage_bucket.dendrite_static.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.cloud_function_runtime.email}"
}

resource "google_storage_bucket" "gcf_source_bucket" {
  name     = "gcf-source-${var.project_id}-${var.region}${local.environment_suffix}"
  location = var.region

  uniform_bucket_level_access = true
  force_destroy               = true
}

resource "google_project_service" "firestore" {
  project            = var.project_id
  service            = "firestore.googleapis.com"
  disable_on_destroy = false

  lifecycle {
    prevent_destroy = true
  }
}

resource "google_project_service" "cloudfunctions" {
  project            = var.project_id
  service            = "cloudfunctions.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "cloudbuild" {
  project            = var.project_id
  service            = "cloudbuild.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "cloudscheduler" {
  project            = var.project_id
  service            = "cloudscheduler.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "firebaserules" {
  project            = var.project_id
  service            = "firebaserules.googleapis.com"
  disable_on_destroy = false

  lifecycle {
    prevent_destroy = true
  }
}

# Needed for Gen2 (backed by Cloud Run)
resource "google_project_service" "run" {
  project            = var.project_id
  service            = "run.googleapis.com"
  disable_on_destroy = false
}

# Container images for Gen2 builds live here
resource "google_project_service" "artifactregistry" {
  project            = var.project_id
  service            = "artifactregistry.googleapis.com"
  disable_on_destroy = false
}

# Optional now, useful later for non-HTTP triggers
resource "google_project_service" "eventarc" {
  project            = var.project_id
  service            = "eventarc.googleapis.com"
  disable_on_destroy = false
}

resource "google_firestore_database" "default" {
  project     = var.project_id
  name        = "(default)"
  location_id = var.region
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

resource "google_project_iam_member" "terraform_cloudfunctions_viewer" {
  project = var.project_id
  role    = "roles/cloudfunctions.viewer"
  member  = "serviceAccount:terraform@${var.project_id}.iam.gserviceaccount.com"
}

resource "google_project_iam_member" "terraform_set_iam_policy" {
  project = var.project_id
  role    = "roles/cloudfunctions.admin"
  member  = "serviceAccount:terraform@${var.project_id}.iam.gserviceaccount.com"
}

resource "google_project_iam_member" "terraform_create_sa" {
  project = var.project_id
  role    = "roles/iam.serviceAccountAdmin"
  member  = "serviceAccount:terraform@${var.project_id}.iam.gserviceaccount.com"
}

resource "google_project_iam_member" "terraform_cloudscheduler_admin" {
  project = var.project_id
  role    = "roles/cloudscheduler.admin"
  member  = "serviceAccount:terraform@${var.project_id}.iam.gserviceaccount.com"
}

resource "google_project_iam_member" "ci_firebaserules_admin" {
  project = var.project_id
  role    = "roles/firebaserules.admin"
  member  = "serviceAccount:terraform@${var.project_id}.iam.gserviceaccount.com"
}

resource "google_project_iam_member" "build_loadbalancer_admin" {
  project = var.project_id
  role    = "roles/compute.loadBalancerAdmin"
  member  = "serviceAccount:${data.google_project.project.number}@cloudbuild.gserviceaccount.com"
}

resource "google_project_iam_member" "terraform_loadbalancer_admin" {
  project = var.project_id
  role    = "roles/compute.loadBalancerAdmin"
  member  = "serviceAccount:terraform@${var.project_id}.iam.gserviceaccount.com"
}

resource "google_project_iam_member" "runtime_loadbalancer_admin" {
  project    = var.project_id
  role       = "roles/compute.loadBalancerAdmin"
  member     = "serviceAccount:${google_service_account.cloud_function_runtime.email}"
  depends_on = [google_service_account.cloud_function_runtime]
}

resource "google_project_iam_member" "terraform_security_admin" {
  project = var.project_id
  role    = "roles/compute.securityAdmin"
  member  = "serviceAccount:terraform@${var.project_id}.iam.gserviceaccount.com"
}

locals {
  cloud_function_runtime_sa_suffix    = "cfrt"
  cloud_function_runtime_raw_id       = "sa-${var.environment}-${local.cloud_function_runtime_sa_suffix}"
  # The generated environment identifier is already limited to lowercase
  # hexadecimal characters, so simply lower-case the composed id to satisfy the
  # service account naming rules without relying on regexreplace (which is
  # unavailable in older Terraform releases).
  cloud_function_runtime_cleaned      = lower(local.cloud_function_runtime_raw_id)
  cloud_function_runtime_clipped      = substr(local.cloud_function_runtime_cleaned, 0, 30)
  cloud_function_runtime_account_id   = trim(local.cloud_function_runtime_clipped, "-")
}

resource "google_service_account" "cloud_function_runtime" {
  account_id   = local.cloud_function_runtime_account_id
  display_name = "Cloud Function Runtime Service Account"
}

resource "google_service_account_iam_member" "terraform_can_impersonate_runtime" {
  service_account_id = google_service_account.cloud_function_runtime.name
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:terraform@${var.project_id}.iam.gserviceaccount.com"
}

resource "google_service_account_iam_member" "terraform_can_impersonate_default_compute" {
  service_account_id = "projects/${var.project_id}/serviceAccounts/${data.google_project.project.number}-compute@developer.gserviceaccount.com"
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:terraform@${var.project_id}.iam.gserviceaccount.com"
}

resource "google_project_iam_member" "runtime_firestore_access" {
  project = var.project_id
  role    = "roles/datastore.user"
  member  = "serviceAccount:${google_service_account.cloud_function_runtime.email}"

  depends_on = [
    google_service_account.cloud_function_runtime,
    google_project_service.firestore
  ]
}


data "archive_file" "get_api_key_src" {
  type        = "zip"
  source_dir  = "${path.module}/cloud-functions/get-api-key-credit"
  output_path = "${path.module}/build/get-api-key-credit.zip"
}

resource "google_storage_bucket_object" "get_api_key_credit" {
  name   = "${var.environment}-get-api-key-credit-${data.archive_file.get_api_key_src.output_sha256}.zip"
  bucket = google_storage_bucket.gcf_source_bucket.name
  source = data.archive_file.get_api_key_src.output_path
}

resource "google_cloudfunctions_function" "get_api_key_credit" {
  name                         = "${var.environment}-get-api-key-credit"
  description                  = "Returns credit for an API key"
  runtime                      = var.cloud_functions_runtime
  available_memory_mb          = 128
  source_archive_bucket        = google_storage_bucket.gcf_source_bucket.name
  source_archive_object        = google_storage_bucket_object.get_api_key_credit.name
  entry_point                  = "handler"
  trigger_http                 = true
  https_trigger_security_level = var.https_security_level
  service_account_email        = google_service_account.cloud_function_runtime.email
  region                       = var.region

  environment_variables = {
    GCLOUD_PROJECT       = var.project_id
    GOOGLE_CLOUD_PROJECT = var.project_id
    FIREBASE_CONFIG      = jsonencode({ projectId = var.project_id })
  }


  depends_on = [
    google_project_service.cloudfunctions,
    google_project_service.cloudbuild,
    google_project_iam_member.cloudfunctions_access,
    google_service_account_iam_member.terraform_can_impersonate_runtime,
    google_service_account_iam_member.terraform_can_impersonate_default_compute,
  ]
}

resource "google_cloudfunctions_function_iam_member" "invoker" {
  project        = var.project_id
  region         = var.region
  cloud_function = google_cloudfunctions_function.get_api_key_credit.name
  role           = "roles/cloudfunctions.invoker"
  member         = "allUsers"
  depends_on = [
    google_cloudfunctions_function.get_api_key_credit,
    google_project_iam_member.terraform_cloudfunctions_viewer,
  ]
}

data "archive_file" "submit_src" {
  type        = "zip"
  source_dir  = "${path.module}/cloud-functions/submit-new-story"
  output_path = "${path.module}/build/submit-new-story.zip"
}

data "archive_file" "submit_page_src" {
  type        = "zip"
  source_dir  = "${path.module}/cloud-functions/submit-new-page"
  output_path = "${path.module}/build/submit-new-page.zip"
}

resource "google_storage_bucket_object" "submit_new_story" {
  name   = "${var.environment}-submit-new-story-${data.archive_file.submit_src.output_sha256}.zip"
  bucket = google_storage_bucket.gcf_source_bucket.name
  source = data.archive_file.submit_src.output_path
}

resource "google_storage_bucket_object" "submit_new_page" {
  name   = "${var.environment}-submit-new-page-${data.archive_file.submit_page_src.output_sha256}.zip"
  bucket = google_storage_bucket.gcf_source_bucket.name
  source = data.archive_file.submit_page_src.output_path
}

resource "google_cloudfunctions_function" "submit_new_story" {
  name                         = "${var.environment}-submit-new-story"
  runtime                      = var.cloud_functions_runtime
  entry_point                  = "submitNewStory"
  source_archive_bucket        = google_storage_bucket.gcf_source_bucket.name
  source_archive_object        = google_storage_bucket_object.submit_new_story.name
  trigger_http                 = true
  https_trigger_security_level = var.https_security_level
  service_account_email        = google_service_account.cloud_function_runtime.email
  region                       = var.region

  environment_variables = {
    GCLOUD_PROJECT       = var.project_id
    GOOGLE_CLOUD_PROJECT = var.project_id
    FIREBASE_CONFIG      = jsonencode({ projectId = var.project_id })
  }


  depends_on = [
    google_project_service.cloudfunctions,
    google_project_service.cloudbuild,
    google_project_iam_member.cloudfunctions_access,
    google_service_account_iam_member.terraform_can_impersonate_runtime,
    google_service_account_iam_member.terraform_can_impersonate_default_compute,
  ]
}

resource "google_cloudfunctions_function" "submit_new_page" {
  name                         = "${var.environment}-submit-new-page"
  runtime                      = var.cloud_functions_runtime
  entry_point                  = "submitNewPage"
  source_archive_bucket        = google_storage_bucket.gcf_source_bucket.name
  source_archive_object        = google_storage_bucket_object.submit_new_page.name
  trigger_http                 = true
  https_trigger_security_level = var.https_security_level
  service_account_email        = google_service_account.cloud_function_runtime.email
  region                       = var.region

  environment_variables = {
    GCLOUD_PROJECT       = var.project_id
    GOOGLE_CLOUD_PROJECT = var.project_id
    FIREBASE_CONFIG      = jsonencode({ projectId = var.project_id })
  }


  depends_on = [
    google_project_service.cloudfunctions,
    google_project_service.cloudbuild,
    google_project_iam_member.cloudfunctions_access,
    google_service_account_iam_member.terraform_can_impersonate_runtime,
    google_service_account_iam_member.terraform_can_impersonate_default_compute,
  ]
}

resource "google_cloudfunctions_function_iam_member" "submit_new_story_invoker" {
  project        = var.project_id
  region         = var.region
  cloud_function = google_cloudfunctions_function.submit_new_story.name
  role           = "roles/cloudfunctions.invoker"
  member         = "allUsers"
  depends_on = [
    google_cloudfunctions_function.submit_new_story,
    google_project_iam_member.terraform_cloudfunctions_viewer,
  ]
}

resource "google_cloudfunctions_function_iam_member" "submit_new_page_invoker" {
  project        = var.project_id
  region         = var.region
  cloud_function = google_cloudfunctions_function.submit_new_page.name
  role           = "roles/cloudfunctions.invoker"
  member         = "allUsers"
  depends_on = [
    google_cloudfunctions_function.submit_new_page,
    google_project_iam_member.terraform_cloudfunctions_viewer,
  ]
}

data "archive_file" "assign_moderation_job_src" {
  type        = "zip"
  source_dir  = "${path.module}/cloud-functions/assign-moderation-job"
  output_path = "${path.module}/build/assign-moderation-job.zip"
}

resource "google_storage_bucket_object" "assign_moderation_job" {
  name   = "${var.environment}-assign-moderation-job-${data.archive_file.assign_moderation_job_src.output_sha256}.zip"
  bucket = google_storage_bucket.gcf_source_bucket.name
  source = data.archive_file.assign_moderation_job_src.output_path
}

resource "google_cloudfunctions_function" "assign_moderation_job" {
  name                         = "${var.environment}-assign-moderation-job"
  runtime                      = var.cloud_functions_runtime
  entry_point                  = "assignModerationJob"
  source_archive_bucket        = google_storage_bucket.gcf_source_bucket.name
  source_archive_object        = google_storage_bucket_object.assign_moderation_job.name
  trigger_http                 = true
  https_trigger_security_level = var.https_security_level
  service_account_email        = google_service_account.cloud_function_runtime.email
  region                       = var.region

  environment_variables = {
    GCLOUD_PROJECT       = var.project_id
    GOOGLE_CLOUD_PROJECT = var.project_id
    FIREBASE_CONFIG      = jsonencode({ projectId = var.project_id })
  }

  depends_on = [
    google_project_service.cloudfunctions,
    google_project_service.cloudbuild,
    google_project_iam_member.cloudfunctions_access,
    google_service_account_iam_member.terraform_can_impersonate_runtime,
    google_service_account_iam_member.terraform_can_impersonate_default_compute,
  ]
}

resource "google_cloudfunctions_function_iam_member" "assign_moderation_job_invoker" {
  project        = var.project_id
  region         = var.region
  cloud_function = google_cloudfunctions_function.assign_moderation_job.name
  role           = "roles/cloudfunctions.invoker"
  member         = "allUsers"
  depends_on = [
    google_cloudfunctions_function.assign_moderation_job,
    google_project_iam_member.terraform_cloudfunctions_viewer,
  ]
}

data "archive_file" "get_moderation_variant_src" {
  type        = "zip"
  source_dir  = "${path.module}/cloud-functions/get-moderation-variant"
  output_path = "${path.module}/build/get-moderation-variant.zip"
}

resource "google_storage_bucket_object" "get_moderation_variant" {
  name   = "${var.environment}-get-moderation-variant-${data.archive_file.get_moderation_variant_src.output_sha256}.zip"
  bucket = google_storage_bucket.gcf_source_bucket.name
  source = data.archive_file.get_moderation_variant_src.output_path
}

resource "google_cloudfunctions_function" "get_moderation_variant" {
  name                         = "${var.environment}-get-moderation-variant"
  runtime                      = var.cloud_functions_runtime
  entry_point                  = "getModerationVariant"
  source_archive_bucket        = google_storage_bucket.gcf_source_bucket.name
  source_archive_object        = google_storage_bucket_object.get_moderation_variant.name
  trigger_http                 = true
  https_trigger_security_level = var.https_security_level
  service_account_email        = google_service_account.cloud_function_runtime.email
  region                       = var.region

  environment_variables = {
    GCLOUD_PROJECT       = var.project_id
    GOOGLE_CLOUD_PROJECT = var.project_id
    FIREBASE_CONFIG      = jsonencode({ projectId = var.project_id })
  }

  depends_on = [
    google_project_service.cloudfunctions,
    google_project_service.cloudbuild,
    google_project_iam_member.cloudfunctions_access,
    google_service_account_iam_member.terraform_can_impersonate_runtime,
    google_service_account_iam_member.terraform_can_impersonate_default_compute,
  ]
}

resource "google_cloudfunctions_function_iam_member" "get_moderation_variant_invoker" {
  project        = var.project_id
  region         = var.region
  cloud_function = google_cloudfunctions_function.get_moderation_variant.name
  role           = "roles/cloudfunctions.invoker"
  member         = "allUsers"

  depends_on = [
    google_cloudfunctions_function.get_moderation_variant,
    google_project_iam_member.terraform_cloudfunctions_viewer,
  ]
}
data "archive_file" "submit_moderation_rating_src" {
  type        = "zip"
  source_dir  = "${path.module}/cloud-functions/submit-moderation-rating"
  output_path = "${path.module}/build/submit-moderation-rating.zip"
}

resource "google_storage_bucket_object" "submit_moderation_rating" {
  name   = "${var.environment}-submit-moderation-rating-${data.archive_file.submit_moderation_rating_src.output_sha256}.zip"
  bucket = google_storage_bucket.gcf_source_bucket.name
  source = data.archive_file.submit_moderation_rating_src.output_path
}

resource "google_cloudfunctions_function" "submit_moderation_rating" {
  name                         = "${var.environment}-submit-moderation-rating"
  runtime                      = var.cloud_functions_runtime
  entry_point                  = "submitModerationRating"
  source_archive_bucket        = google_storage_bucket.gcf_source_bucket.name
  source_archive_object        = google_storage_bucket_object.submit_moderation_rating.name
  trigger_http                 = true
  https_trigger_security_level = var.https_security_level
  service_account_email        = google_service_account.cloud_function_runtime.email
  region                       = var.region

  environment_variables = {
    GCLOUD_PROJECT       = var.project_id
    GOOGLE_CLOUD_PROJECT = var.project_id
    FIREBASE_CONFIG      = jsonencode({ projectId = var.project_id })
  }

  depends_on = [
    google_project_service.cloudfunctions,
    google_project_service.cloudbuild,
    google_project_iam_member.cloudfunctions_access,
    google_service_account_iam_member.terraform_can_impersonate_runtime,
    google_service_account_iam_member.terraform_can_impersonate_default_compute,
  ]
}

resource "google_cloudfunctions_function_iam_member" "submit_moderation_rating_invoker" {
  project        = var.project_id
  region         = var.region
  cloud_function = google_cloudfunctions_function.submit_moderation_rating.name
  role           = "roles/cloudfunctions.invoker"
  member         = "allUsers"
  depends_on = [
    google_cloudfunctions_function.submit_moderation_rating,
    google_project_iam_member.terraform_cloudfunctions_viewer,
  ]
}


data "archive_file" "report_for_moderation_src" {
  type        = "zip"
  source_dir  = "${path.module}/cloud-functions/report-for-moderation"
  output_path = "${path.module}/build/report-for-moderation.zip"
}

resource "google_storage_bucket_object" "report_for_moderation" {
  name   = "${var.environment}-report-for-moderation-${data.archive_file.report_for_moderation_src.output_sha256}.zip"
  bucket = google_storage_bucket.gcf_source_bucket.name
  source = data.archive_file.report_for_moderation_src.output_path
}

resource "google_cloudfunctions_function" "report_for_moderation" {
  name                         = "${var.environment}-report-for-moderation"
  runtime                      = var.cloud_functions_runtime
  entry_point                  = "reportForModeration"
  source_archive_bucket        = google_storage_bucket.gcf_source_bucket.name
  source_archive_object        = google_storage_bucket_object.report_for_moderation.name
  trigger_http                 = true
  https_trigger_security_level = var.https_security_level
  service_account_email        = google_service_account.cloud_function_runtime.email
  region                       = var.region

  environment_variables = {
    GCLOUD_PROJECT       = var.project_id
    GOOGLE_CLOUD_PROJECT = var.project_id
    FIREBASE_CONFIG      = jsonencode({ projectId = var.project_id })
  }

  depends_on = [
    google_project_service.cloudfunctions,
    google_project_service.cloudbuild,
    google_project_iam_member.cloudfunctions_access,
    google_service_account_iam_member.terraform_can_impersonate_runtime,
    google_service_account_iam_member.terraform_can_impersonate_default_compute,
  ]
}

resource "google_cloudfunctions_function_iam_member" "report_for_moderation_invoker" {
  project        = var.project_id
  region         = var.region
  cloud_function = google_cloudfunctions_function.report_for_moderation.name
  role           = "roles/cloudfunctions.invoker"
  member         = "allUsers"
  depends_on = [
    google_cloudfunctions_function.report_for_moderation,
    google_project_iam_member.terraform_cloudfunctions_viewer,
  ]
}


data "archive_file" "process_src" {
  type        = "zip"
  source_dir  = "${path.module}/cloud-functions/process-new-story"
  output_path = "${path.module}/build/process-new-story.zip"
}

resource "google_storage_bucket_object" "process_new_story" {
  name   = "${var.environment}-process-new-story-${data.archive_file.process_src.output_sha256}.zip"
  bucket = google_storage_bucket.gcf_source_bucket.name
  source = data.archive_file.process_src.output_path
}

resource "google_cloudfunctions_function" "process_new_story" {
  name        = "${var.environment}-process-new-story"
  runtime     = var.cloud_functions_runtime
  region      = var.region
  entry_point = "processNewStory"

  source_archive_bucket = google_storage_bucket.gcf_source_bucket.name
  source_archive_object = google_storage_bucket_object.process_new_story.name

  service_account_email = google_service_account.cloud_function_runtime.email

  environment_variables = {
    GCLOUD_PROJECT       = var.project_id
    GOOGLE_CLOUD_PROJECT = var.project_id
    FIREBASE_CONFIG      = jsonencode({ projectId = var.project_id })
  }


  event_trigger {
    event_type = "providers/cloud.firestore/eventTypes/document.create"
    resource   = "projects/${var.project_id}/databases/(default)/documents/storyFormSubmissions/{subId}"
  }

  depends_on = [
    google_project_service.cloudfunctions,
    google_project_service.cloudbuild,
    google_project_iam_member.cloudfunctions_access
  ]
}

data "archive_file" "prod_update_variant_visibility_src" {
  type        = "zip"
  source_dir  = "${path.module}/cloud-functions/prod-update-variant-visibility"
  output_path = "${path.module}/build/prod-update-variant-visibility.zip"
}

resource "google_storage_bucket_object" "prod_update_variant_visibility" {
  name   = "${var.environment}-update-variant-visibility-${data.archive_file.prod_update_variant_visibility_src.output_sha256}.zip"
  bucket = google_storage_bucket.gcf_source_bucket.name
  source = data.archive_file.prod_update_variant_visibility_src.output_path
}

resource "google_cloudfunctions_function" "prod_update_variant_visibility" {
  name        = "${var.environment}-update-variant-visibility"
  runtime     = var.cloud_functions_runtime
  region      = var.region
  entry_point = "prodUpdateVariantVisibility"

  source_archive_bucket = google_storage_bucket.gcf_source_bucket.name
  source_archive_object = google_storage_bucket_object.prod_update_variant_visibility.name

  service_account_email = google_service_account.cloud_function_runtime.email

  environment_variables = {
    GCLOUD_PROJECT       = var.project_id
    GOOGLE_CLOUD_PROJECT = var.project_id
    FIREBASE_CONFIG      = jsonencode({ projectId = var.project_id })
  }

  event_trigger {
    event_type = "providers/cloud.firestore/eventTypes/document.create"
    resource   = "projects/${var.project_id}/databases/(default)/documents/moderationRatings/{ratingId}"
  }

  depends_on = [
    google_project_service.cloudfunctions,
    google_project_service.cloudbuild,
    google_project_iam_member.cloudfunctions_access
  ]
}

data "archive_file" "process_page_src" {
  type        = "zip"
  source_dir  = "${path.module}/cloud-functions/process-new-page"
  output_path = "${path.module}/build/process-new-page.zip"
}

resource "google_storage_bucket_object" "process_new_page" {
  name   = "${var.environment}-process-new-page-${data.archive_file.process_page_src.output_sha256}.zip"
  bucket = google_storage_bucket.gcf_source_bucket.name
  source = data.archive_file.process_page_src.output_path
}

resource "google_cloudfunctions_function" "process_new_page" {
  name        = "${var.environment}-process-new-page"
  runtime     = var.cloud_functions_runtime
  region      = var.region
  entry_point = "processNewPage"

  source_archive_bucket = google_storage_bucket.gcf_source_bucket.name
  source_archive_object = google_storage_bucket_object.process_new_page.name

  service_account_email = google_service_account.cloud_function_runtime.email

  environment_variables = {
    GCLOUD_PROJECT       = var.project_id
    GOOGLE_CLOUD_PROJECT = var.project_id
    FIREBASE_CONFIG      = jsonencode({ projectId = var.project_id })
  }


  event_trigger {
    event_type = "providers/cloud.firestore/eventTypes/document.create"
    resource   = "projects/${var.project_id}/databases/(default)/documents/pageFormSubmissions/{subId}"
  }

  depends_on = [
    google_project_service.cloudfunctions,
    google_project_service.cloudbuild,
    google_project_iam_member.cloudfunctions_access
  ]
}

data "archive_file" "render_variant_src" {
  type        = "zip"
  source_dir  = "${path.module}/cloud-functions/render-variant"
  output_path = "${path.module}/build/render-variant.zip"
}

resource "google_storage_bucket_object" "render_variant" {
  name   = "${var.environment}-render-variant-${data.archive_file.render_variant_src.output_sha256}.zip"
  bucket = google_storage_bucket.gcf_source_bucket.name
  source = data.archive_file.render_variant_src.output_path
}

resource "google_cloudfunctions_function" "render_variant" {
  name        = "${var.environment}-render-variant"
  runtime     = var.cloud_functions_runtime
  region      = var.region
  entry_point = "renderVariant"

  source_archive_bucket = google_storage_bucket.gcf_source_bucket.name
  source_archive_object = google_storage_bucket_object.render_variant.name

  service_account_email = google_service_account.cloud_function_runtime.email

  environment_variables = {
    GCLOUD_PROJECT       = var.project_id
    GOOGLE_CLOUD_PROJECT = var.project_id
    FIREBASE_CONFIG      = jsonencode({ projectId = var.project_id })
  }


  event_trigger {
    event_type = "providers/cloud.firestore/eventTypes/document.write"
    resource   = "projects/${var.project_id}/databases/(default)/documents/stories/{storyId}/pages/{pageId}/variants/{variantId}"
  }

  depends_on = [
    google_project_service.cloudfunctions,
    google_project_service.cloudbuild,
    google_project_iam_member.cloudfunctions_access
  ]
}

data "archive_file" "hide_variant_html_src" {
  type        = "zip"
  source_dir  = "${path.module}/cloud-functions/hide-variant-html"
  output_path = "${path.module}/build/hide-variant-html.zip"
}

resource "google_storage_bucket_object" "hide_variant_html" {
  name   = "${var.environment}-hide-variant-html-${data.archive_file.hide_variant_html_src.output_sha256}.zip"
  bucket = google_storage_bucket.gcf_source_bucket.name
  source = data.archive_file.hide_variant_html_src.output_path
}

resource "google_cloudfunctions_function" "hide_variant_html" {
  name        = "${var.environment}-hide-variant-html"
  runtime     = var.cloud_functions_runtime
  region      = var.region
  entry_point = "hideVariantHtml"

  source_archive_bucket = google_storage_bucket.gcf_source_bucket.name
  source_archive_object = google_storage_bucket_object.hide_variant_html.name

  service_account_email = google_service_account.cloud_function_runtime.email

  environment_variables = {
    GCLOUD_PROJECT       = var.project_id
    GOOGLE_CLOUD_PROJECT = var.project_id
    FIREBASE_CONFIG      = jsonencode({ projectId = var.project_id })
  }

  event_trigger {
    event_type = "providers/cloud.firestore/eventTypes/document.write"
    resource   = "projects/${var.project_id}/databases/(default)/documents/stories/{storyId}/pages/{pageId}/variants/{variantId}"
  }

  depends_on = [
    google_project_service.cloudfunctions,
    google_project_service.cloudbuild,
    google_project_iam_member.cloudfunctions_access
  ]
}

data "archive_file" "mark_variant_dirty_src" {
  type        = "zip"
  source_dir  = "${path.module}/cloud-functions/mark-variant-dirty"
  output_path = "${path.module}/build/mark-variant-dirty.zip"
}

resource "google_storage_bucket_object" "mark_variant_dirty" {
  name   = "${var.environment}-mark-variant-dirty-${data.archive_file.mark_variant_dirty_src.output_sha256}.zip"
  bucket = google_storage_bucket.gcf_source_bucket.name
  source = data.archive_file.mark_variant_dirty_src.output_path
}

resource "google_cloudfunctions_function" "mark_variant_dirty" {
  name                         = "${var.environment}-mark-variant-dirty"
  runtime                      = var.cloud_functions_runtime
  entry_point                  = "markVariantDirty"
  source_archive_bucket        = google_storage_bucket.gcf_source_bucket.name
  source_archive_object        = google_storage_bucket_object.mark_variant_dirty.name
  trigger_http                 = true
  https_trigger_security_level = var.https_security_level
  service_account_email        = google_service_account.cloud_function_runtime.email
  region                       = var.region

  environment_variables = {
    GCLOUD_PROJECT       = var.project_id
    GOOGLE_CLOUD_PROJECT = var.project_id
    FIREBASE_CONFIG      = jsonencode({ projectId = var.project_id })
  }

  depends_on = [
    google_project_service.cloudfunctions,
    google_project_service.cloudbuild,
    google_project_iam_member.cloudfunctions_access,
    google_service_account_iam_member.terraform_can_impersonate_runtime,
    google_service_account_iam_member.terraform_can_impersonate_default_compute,
  ]
}

resource "google_cloudfunctions_function_iam_member" "mark_variant_dirty_invoker" {
  project        = var.project_id
  region         = var.region
  cloud_function = google_cloudfunctions_function.mark_variant_dirty.name
  role           = "roles/cloudfunctions.invoker"
  member         = "allUsers"
  depends_on = [
    google_cloudfunctions_function.mark_variant_dirty,
    google_project_iam_member.terraform_cloudfunctions_viewer,
  ]
}

data "archive_file" "generate_stats_src" {
  type        = "zip"
  source_dir  = "${path.module}/cloud-functions/generate-stats"
  output_path = "${path.module}/build/generate-stats.zip"
}

resource "google_storage_bucket_object" "generate_stats" {
  name   = "${var.environment}-generate-stats-${data.archive_file.generate_stats_src.output_sha256}.zip"
  bucket = google_storage_bucket.gcf_source_bucket.name
  source = data.archive_file.generate_stats_src.output_path
}

resource "google_cloudfunctions_function" "generate_stats" {
  name                         = "${var.environment}-generate-stats"
  runtime                      = var.cloud_functions_runtime
  entry_point                  = "generateStats"
  source_archive_bucket        = google_storage_bucket.gcf_source_bucket.name
  source_archive_object        = google_storage_bucket_object.generate_stats.name
  trigger_http                 = true
  https_trigger_security_level = var.https_security_level
  service_account_email        = google_service_account.cloud_function_runtime.email
  region                       = var.region

  environment_variables = {
    GCLOUD_PROJECT       = var.project_id
    GOOGLE_CLOUD_PROJECT = var.project_id
    FIREBASE_CONFIG      = jsonencode({ projectId = var.project_id })
  }

  depends_on = [
    google_project_service.cloudfunctions,
    google_project_service.cloudbuild,
    google_project_iam_member.cloudfunctions_access,
    google_service_account_iam_member.terraform_can_impersonate_runtime,
    google_service_account_iam_member.terraform_can_impersonate_default_compute,
  ]
}

resource "google_cloudfunctions_function_iam_member" "generate_stats_invoker" {
  project        = var.project_id
  region         = var.region
  cloud_function = google_cloudfunctions_function.generate_stats.name
  role           = "roles/cloudfunctions.invoker"
  member         = "allUsers"
  depends_on = [
    google_cloudfunctions_function.generate_stats,
    google_project_iam_member.terraform_cloudfunctions_viewer,
  ]
}

resource "google_cloud_scheduler_job" "generate_stats_daily" {
  name      = "${var.environment}-generate-stats-daily"
  schedule  = "0 0 * * *"
  time_zone = "UTC"
  http_target {
    http_method = "POST"
    uri         = google_cloudfunctions_function.generate_stats.https_trigger_url
    headers = {
      "X-Appengine-Cron" = "true"
    }
  }
  depends_on = [
    google_project_service.cloudscheduler,
    google_cloudfunctions_function.generate_stats,
    google_project_iam_member.terraform_cloudscheduler_admin,
  ]
}

data "archive_file" "render_contents_src" {
  type        = "zip"
  source_dir  = "${path.module}/cloud-functions/render-contents"
  output_path = "${path.module}/build/render-contents.zip"
}

resource "google_storage_bucket_object" "render_contents" {
  name   = "${var.environment}-render-contents-${data.archive_file.render_contents_src.output_sha256}.zip"
  bucket = google_storage_bucket.gcf_source_bucket.name
  source = data.archive_file.render_contents_src.output_path
}

resource "google_cloudfunctions_function" "render_contents" {
  name        = "${var.environment}-render-contents"
  runtime     = var.cloud_functions_runtime
  region      = var.region
  entry_point = "renderContents"

  source_archive_bucket = google_storage_bucket.gcf_source_bucket.name
  source_archive_object = google_storage_bucket_object.render_contents.name

  service_account_email = google_service_account.cloud_function_runtime.email

  environment_variables = {
    GCLOUD_PROJECT       = var.project_id
    GOOGLE_CLOUD_PROJECT = var.project_id
    FIREBASE_CONFIG      = jsonencode({ projectId = var.project_id })
  }


  event_trigger {
    event_type = "providers/cloud.firestore/eventTypes/document.create"
    resource   = "projects/${var.project_id}/databases/(default)/documents/stories/{storyId}"
  }

  depends_on = [
    google_project_service.cloudfunctions,
    google_project_service.cloudbuild,
    google_project_iam_member.cloudfunctions_access
  ]
}

resource "google_cloudfunctions_function" "trigger_render_contents" {
  name                         = "${var.environment}-trigger-render-contents"
  runtime                      = var.cloud_functions_runtime
  entry_point                  = "triggerRenderContents"
  source_archive_bucket        = google_storage_bucket.gcf_source_bucket.name
  source_archive_object        = google_storage_bucket_object.render_contents.name
  trigger_http                 = true
  https_trigger_security_level = var.https_security_level
  service_account_email        = google_service_account.cloud_function_runtime.email
  region                       = var.region

  environment_variables = {
    GCLOUD_PROJECT       = var.project_id
    GOOGLE_CLOUD_PROJECT = var.project_id
    FIREBASE_CONFIG      = jsonencode({ projectId = var.project_id })
  }

  depends_on = [
    google_project_service.cloudfunctions,
    google_project_service.cloudbuild,
    google_project_iam_member.cloudfunctions_access,
    google_service_account_iam_member.terraform_can_impersonate_runtime,
    google_service_account_iam_member.terraform_can_impersonate_default_compute,
  ]
}

resource "google_cloudfunctions_function_iam_member" "trigger_render_contents_invoker" {
  project        = var.project_id
  region         = var.region
  cloud_function = google_cloudfunctions_function.trigger_render_contents.name
  role           = "roles/cloudfunctions.invoker"
  member         = "allUsers"
  depends_on = [
    google_cloudfunctions_function.trigger_render_contents,
    google_project_iam_member.terraform_cloudfunctions_viewer,
  ]
}
