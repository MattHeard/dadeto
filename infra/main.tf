terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "~> 5.0"
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

resource "google_storage_bucket" "dendrite_static" {
  name     = var.static_site_bucket_name
  location = var.region

  website {
    main_page_suffix = "index.html"
    not_found_page   = "404.html"
  }

  lifecycle {
    prevent_destroy = true     # prod safety belt
  }
}

resource "google_storage_bucket_object" "dendrite_index" {
  name         = "index.html"
  bucket       = google_storage_bucket.dendrite_static.name
  source       = "${path.module}/index.html"
  content_type = "text/html"

  lifecycle {
    ignore_changes = [
      content
    ]
  }
}

resource "google_storage_bucket_object" "dendrite_404" {
  name         = "404.html"
  bucket       = google_storage_bucket.dendrite_static.name
  source       = "${path.module}/404.html"
  content_type = "text/html"
}

resource "google_storage_bucket_object" "dendrite_new_story" {
  name         = "new-story.html"
  bucket       = google_storage_bucket.dendrite_static.name
  source       = "${path.module}/new-story.html"
  content_type = "text/html"
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
  name     = "gcf-source-${var.project_id}-${var.region}"
  location = var.region

  uniform_bucket_level_access = true
  force_destroy               = true
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

resource "google_project_service" "firebaserules" {
  project = var.project_id
  service = "firebaserules.googleapis.com"
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

resource "google_project_iam_member" "ci_firebaserules_admin" {
  project = var.project_id
  role    = "roles/firebaserules.admin"
  member  = "serviceAccount:terraform@${var.project_id}.iam.gserviceaccount.com"
}

resource "google_service_account" "cloud_function_runtime" {
  account_id   = "cloud-function-runtime"
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
  name   = "get-api-key-credit-${data.archive_file.get_api_key_src.output_sha256}.zip"
  bucket = google_storage_bucket.gcf_source_bucket.name
  source = data.archive_file.get_api_key_src.output_path
}

resource "google_cloudfunctions_function" "get_api_key_credit" {
  name        = "get-api-key-credit"
  description = "Returns credit for an API key"
  runtime     = var.cloud_functions_runtime
  available_memory_mb   = 128
  source_archive_bucket = google_storage_bucket.gcf_source_bucket.name
  source_archive_object = google_storage_bucket_object.get_api_key_credit.name
  entry_point = "handler"
  trigger_http = true
  https_trigger_security_level = var.https_security_level
  service_account_email = google_service_account.cloud_function_runtime.email
  region = var.region

  environment_variables = {
    GCLOUD_PROJECT       = var.project_id
    GOOGLE_CLOUD_PROJECT = var.project_id
    FIREBASE_CONFIG      = jsonencode({ projectId = var.project_id })
  }

  lifecycle {
    create_before_destroy = true
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
  name   = "submit-new-story-${data.archive_file.submit_src.output_sha256}.zip"
  bucket = google_storage_bucket.gcf_source_bucket.name
  source = data.archive_file.submit_src.output_path
}

resource "google_storage_bucket_object" "submit_new_page" {
  name   = "submit-new-page-${data.archive_file.submit_page_src.output_sha256}.zip"
  bucket = google_storage_bucket.gcf_source_bucket.name
  source = data.archive_file.submit_page_src.output_path
}

resource "google_cloudfunctions_function" "submit_new_story" {
  name        = "submit-new-story"
  runtime     = var.cloud_functions_runtime
  entry_point = "submitNewStory"
  source_archive_bucket = google_storage_bucket.gcf_source_bucket.name
  source_archive_object = google_storage_bucket_object.submit_new_story.name
  trigger_http                 = true
  https_trigger_security_level = var.https_security_level
  service_account_email = google_service_account.cloud_function_runtime.email
  region = var.region

  environment_variables = {
    GCLOUD_PROJECT       = var.project_id
    GOOGLE_CLOUD_PROJECT = var.project_id
    FIREBASE_CONFIG      = jsonencode({ projectId = var.project_id })
  }

  lifecycle {
    create_before_destroy = true
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
  name        = "submit-new-page"
  runtime     = var.cloud_functions_runtime
  entry_point = "submitNewPage"
  source_archive_bucket = google_storage_bucket.gcf_source_bucket.name
  source_archive_object = google_storage_bucket_object.submit_new_page.name
  trigger_http                 = true
  https_trigger_security_level = var.https_security_level
  service_account_email = google_service_account.cloud_function_runtime.email
  region = var.region

  environment_variables = {
    GCLOUD_PROJECT       = var.project_id
    GOOGLE_CLOUD_PROJECT = var.project_id
    FIREBASE_CONFIG      = jsonencode({ projectId = var.project_id })
  }

  lifecycle {
    create_before_destroy = true
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

data "archive_file" "process_src" {
  type        = "zip"
  source_dir  = "${path.module}/cloud-functions/process-new-story"
  output_path = "${path.module}/build/process-new-story.zip"
}

resource "google_storage_bucket_object" "process_new_story" {
  name   = "process-new-story-${data.archive_file.process_src.output_sha256}.zip"
  bucket = google_storage_bucket.gcf_source_bucket.name
  source = data.archive_file.process_src.output_path
}

resource "google_cloudfunctions_function" "process_new_story" {
  name        = "process-new-story"
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

  lifecycle {
    create_before_destroy = true
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

data "archive_file" "process_page_src" {
  type        = "zip"
  source_dir  = "${path.module}/cloud-functions/process-new-page"
  output_path = "${path.module}/build/process-new-page.zip"
}

resource "google_storage_bucket_object" "process_new_page" {
  name   = "process-new-page-${data.archive_file.process_page_src.output_sha256}.zip"
  bucket = google_storage_bucket.gcf_source_bucket.name
  source = data.archive_file.process_page_src.output_path
}

resource "google_cloudfunctions_function" "process_new_page" {
  name        = "process-new-page"
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

  lifecycle {
    create_before_destroy = true
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
  name   = "render-variant-${data.archive_file.render_variant_src.output_sha256}.zip"
  bucket = google_storage_bucket.gcf_source_bucket.name
  source = data.archive_file.render_variant_src.output_path
}

resource "google_cloudfunctions_function" "render_variant" {
  name        = "render-variant"
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

  lifecycle {
    create_before_destroy = true
  }

  event_trigger {
    event_type = "providers/cloud.firestore/eventTypes/document.create"
    resource   = "projects/${var.project_id}/databases/(default)/documents/stories/{storyId}/pages/{pageId}/variants/{variantId}"
  }

  depends_on = [
    google_project_service.cloudfunctions,
    google_project_service.cloudbuild,
    google_project_iam_member.cloudfunctions_access
  ]
}

data "archive_file" "render_contents_src" {
  type        = "zip"
  source_dir  = "${path.module}/cloud-functions/render-contents"
  output_path = "${path.module}/build/render-contents.zip"
}

resource "google_storage_bucket_object" "render_contents" {
  name   = "render-contents-${data.archive_file.render_contents_src.output_sha256}.zip"
  bucket = google_storage_bucket.gcf_source_bucket.name
  source = data.archive_file.render_contents_src.output_path
}

resource "google_cloudfunctions_function" "render_contents" {
  name        = "render-contents"
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

  lifecycle {
    create_before_destroy = true
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
