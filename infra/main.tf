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
  is_prod                        = var.environment == "prod"
  environment_suffix             = local.is_prod ? "" : "-${var.environment}"
  static_site_bucket_name        = local.is_prod ? var.static_site_bucket_name : "${var.environment}-${var.static_site_bucket_name}"
  enable_lb                      = var.enable_lb
  manage_project_level_resources = var.environment == var.project_level_environment
  firestore_database_path        = "projects/${var.project_id}/databases/${var.database_id}"
  firestore_documents_path       = "${local.firestore_database_path}/documents"
  manage_firestore_services      = local.is_prod || local.manage_project_level_resources
  cloud_function_environment = {
    GCLOUD_PROJECT       = var.project_id
    GOOGLE_CLOUD_PROJECT = var.project_id
    FIREBASE_CONFIG      = local.firebase_config_json
  }
  cloud_function_runtime_service_account_email  = google_service_account.cloud_function_runtime.email
  cloud_function_runtime_service_account_member = "serviceAccount:${local.cloud_function_runtime_service_account_email}"
  terraform_service_account_member              = "serviceAccount:terraform@${var.project_id}.iam.gserviceaccount.com"
  all_users_member                              = "allUsers"
  cloud_functions_invoker_role                  = "roles/cloudfunctions.invoker"
  cloud_run_invoker_role                        = "roles/run.invoker"
  storage_object_viewer_role                    = "roles/storage.objectViewer"
  cloud_function_http_dependencies = [
    google_project_service.project_level,
    google_project_iam_member.terraform_service_account_roles["cloudfunctions_access"],
    google_service_account_iam_member.terraform_can_impersonate_runtime,
    google_service_account_iam_member.terraform_can_impersonate_default_compute,
  ]
  cloud_function_event_dependencies = [
    google_project_service.project_level,
    google_project_iam_member.terraform_service_account_roles["cloudfunctions_access"],
    google_service_account_iam_member.terraform_can_impersonate_runtime,
  ]
  project_level_services = {
    cloudfunctions   = "cloudfunctions.googleapis.com"
    cloudbuild       = "cloudbuild.googleapis.com"
    cloudscheduler   = "cloudscheduler.googleapis.com"
    run              = "run.googleapis.com"
    artifactregistry = "artifactregistry.googleapis.com"
    eventarc         = "eventarc.googleapis.com"
  }
  terraform_networking_roles = {
    terraform_security_admin = "roles/compute.securityAdmin"
    terraform_network_admin  = "roles/compute.networkAdmin"
  }
  terraform_service_account_roles = {
    firestore_access                = "roles/datastore.user"
    cloudfunctions_access           = "roles/cloudfunctions.developer"
    terraform_cloudfunctions_viewer = "roles/cloudfunctions.viewer"
    terraform_set_iam_policy        = "roles/cloudfunctions.admin"
    terraform_create_sa             = "roles/iam.serviceAccountAdmin"
    terraform_cloudscheduler_admin  = "roles/cloudscheduler.admin"
    ci_firebaserules_admin          = "roles/firebaserules.admin"
    terraform_loadbalancer_admin    = "roles/compute.loadBalancerAdmin"
  }
  cloud_function_service_keys = [
    "cloudfunctions",
    "cloudbuild",
    "run",
    "artifactregistry",
    "eventarc",
  ]
  static_site_objects = {
    dendrite_404 = {
      name          = "404.html"
      source        = "${path.module}/404.html"
      content_type  = "text/html"
      cache_control = "no-store"
    }
    dendrite_new_story = {
      name         = "new-story.html"
      source       = "${path.module}/new-story.html"
      content_type = "text/html"
    }
    dendrite_new_page = {
      name         = "new-page.html"
      source       = "${path.module}/new-page.html"
      content_type = "text/html"
    }
    dendrite_about = {
      name         = "about.html"
      source       = "${path.module}/about.html"
      content_type = "text/html"
    }
    dendrite_manual = {
      name         = "manual.html"
      source       = "${path.module}/manual.html"
      content_type = "text/html"
    }
    dendrite_google_auth_js = {
      name         = "googleAuth.js"
      source       = "${path.module}/googleAuth.js"
      content_type = "application/javascript"
    }
    dendrite_moderate_js = {
      name         = "moderate.js"
      source       = "${path.module}/moderate.js"
      content_type = "application/javascript"
    }
    dendrite_admin_html = {
      name         = "admin.html"
      source       = "${path.module}/admin.html"
      content_type = "text/html"
    }
    dendrite_admin_js = {
      name         = "admin.js"
      source       = "${path.module}/admin.js"
      content_type = "application/javascript"
    }
    dendrite_robots_txt = {
      name         = "robots.txt"
      source       = "${path.module}/robots.txt"
      content_type = "text/plain"
    }
    dendrite_css = {
      name         = "dendrite.css"
      source       = "${path.module}/dendrite.css"
      content_type = "text/css"
    }
  }
  dendrite_static_bucket_name = element(
    concat(
      google_storage_bucket.dendrite_static_prod[*].name,
      google_storage_bucket.dendrite_static_nonprod[*].name,
    ),
    0,
  )
}

resource "google_storage_bucket" "dendrite_static_prod" {
  count = local.is_prod ? 1 : 0

  name     = local.static_site_bucket_name
  location = var.region

  website {
    main_page_suffix = "index.html"
    not_found_page   = "404.html"
  }

  lifecycle {
    prevent_destroy = true
  }
}

resource "google_storage_bucket" "dendrite_static_nonprod" {
  count = local.is_prod ? 0 : 1

  name     = local.static_site_bucket_name
  location = var.region

  website {
    main_page_suffix = "index.html"
    not_found_page   = "404.html"
  }
}


resource "google_storage_bucket_object" "dendrite_static_files" {
  for_each = local.static_site_objects

  name          = each.value.name
  bucket        = local.dendrite_static_bucket_name
  source        = each.value.source
  content_type  = each.value.content_type
  cache_control = try(each.value.cache_control, null)
}

resource "google_storage_bucket_object" "dendrite_mod" {
  name   = "mod.html"
  bucket = local.dendrite_static_bucket_name
  content = templatefile("${path.module}/mod.html", {
    firebase_web_app_config = local.firebase_config_json
  })
  content_type = "text/html"
}

resource "google_storage_bucket_iam_member" "dendrite_public_read_access" {
  count  = local.is_prod ? 1 : 0
  bucket = local.dendrite_static_bucket_name
  role   = local.storage_object_viewer_role
  member = local.all_users_member
}

resource "google_storage_bucket_iam_member" "dendrite_runtime_writer" {
  bucket = local.dendrite_static_bucket_name
  role   = "roles/storage.objectAdmin"
  member = local.cloud_function_runtime_service_account_member
}

resource "google_storage_bucket" "gcf_source_bucket" {
  name     = "gcf-source-${var.project_id}-${var.region}${local.environment_suffix}"
  location = var.region

  uniform_bucket_level_access = true
  force_destroy               = true
}

resource "google_project_service" "firestore" {
  count              = local.manage_firestore_services ? 1 : 0
  project            = var.project_id
  service            = "firestore.googleapis.com"
  disable_on_destroy = false

  lifecycle {
    prevent_destroy = true
  }
}

resource "google_project_service" "firebaserules" {
  count              = local.manage_firestore_services ? 1 : 0
  project            = var.project_id
  service            = "firebaserules.googleapis.com"
  disable_on_destroy = false

  lifecycle {
    prevent_destroy = true
  }
}

# Needed for Gen2 (backed by Cloud Run)
resource "google_project_service" "project_level" {
  for_each = local.manage_project_level_resources ? local.project_level_services : {}

  project            = var.project_id
  service            = each.value
  disable_on_destroy = false
}

resource "google_firestore_database" "database" {
  count       = var.database_id == "(default)" ? (local.manage_project_level_resources && var.create_default_firestore_database ? 1 : 0) : 1
  project     = var.project_id
  name        = var.database_id
  location_id = var.region
  type        = "FIRESTORE_NATIVE"
  depends_on = [
    google_project_service.firestore,
  ]
}

resource "google_project_iam_member" "terraform_service_account_roles" {
  for_each = local.manage_project_level_resources ? local.terraform_service_account_roles : {}

  project = var.project_id
  role    = each.value
  member  = local.terraform_service_account_member
}

resource "google_project_iam_member" "terraform_service_account_network_roles" {
  for_each = local.manage_project_level_resources || local.playwright_enabled ? local.terraform_networking_roles : {}

  project = var.project_id
  role    = each.value
  member  = local.terraform_service_account_member
}

resource "google_project_iam_member" "terraform_service_account_vpcaccess_admin" {
  count = local.manage_project_level_resources ? 1 : 0

  project = var.project_id
  role    = "roles/vpcaccess.admin"
  member  = local.terraform_service_account_member
}

resource "google_project_iam_member" "build_loadbalancer_admin" {
  count   = local.manage_project_level_resources ? 1 : 0
  project = var.project_id
  role    = local.terraform_service_account_roles["terraform_loadbalancer_admin"]
  member  = "serviceAccount:${data.google_project.project.number}@cloudbuild.gserviceaccount.com"
}

resource "google_project_iam_member" "runtime_loadbalancer_admin" {
  project    = var.project_id
  role       = local.terraform_service_account_roles["terraform_loadbalancer_admin"]
  member     = local.cloud_function_runtime_service_account_member
  depends_on = [google_service_account.cloud_function_runtime]
}

locals {
  cloud_function_runtime_sa_suffix = "cfrt"
  cloud_function_runtime_raw_id    = "sa-${var.environment}-${local.cloud_function_runtime_sa_suffix}"
  # The generated environment identifier is already limited to lowercase
  # hexadecimal characters, so simply lower-case the composed id to satisfy the
  # service account naming rules without relying on regexreplace (which is
  # unavailable in older Terraform releases).
  cloud_function_runtime_cleaned    = lower(local.cloud_function_runtime_raw_id)
  cloud_function_runtime_clipped    = substr(local.cloud_function_runtime_cleaned, 0, 30)
  cloud_function_runtime_account_id = trim(local.cloud_function_runtime_clipped, "-")
}

resource "google_service_account" "cloud_function_runtime" {
  account_id   = local.cloud_function_runtime_account_id
  display_name = "Cloud Function Runtime Service Account"
}

resource "google_service_account_iam_member" "terraform_can_impersonate_runtime" {
  service_account_id = google_service_account.cloud_function_runtime.name
  role               = "roles/iam.serviceAccountUser"
  member             = local.terraform_service_account_member
}

resource "google_service_account_iam_member" "terraform_can_impersonate_default_compute" {
  count              = local.manage_project_level_resources ? 1 : 0
  service_account_id = "projects/${var.project_id}/serviceAccounts/${data.google_project.project.number}-compute@developer.gserviceaccount.com"
  role               = "roles/iam.serviceAccountUser"
  member             = local.terraform_service_account_member
}

resource "google_project_iam_member" "runtime_firestore_access" {
  project = var.project_id
  role    = "roles/datastore.user"
  member  = local.cloud_function_runtime_service_account_member

  depends_on = [
    google_service_account.cloud_function_runtime,
    google_project_service.firestore,
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
  service_account_email        = local.cloud_function_runtime_service_account_email
  region                       = var.region

  environment_variables = local.cloud_function_environment


  depends_on = local.cloud_function_http_dependencies
}

resource "google_cloudfunctions_function_iam_member" "invoker" {
  project        = var.project_id
  region         = var.region
  cloud_function = google_cloudfunctions_function.get_api_key_credit.name
  role           = local.cloud_functions_invoker_role
  member         = local.all_users_member
  depends_on = [
    google_cloudfunctions_function.get_api_key_credit,
    google_project_iam_member.terraform_service_account_roles["terraform_cloudfunctions_viewer"],
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
  service_account_email        = local.cloud_function_runtime_service_account_email
  region                       = var.region

  environment_variables = local.cloud_function_environment


  depends_on = local.cloud_function_http_dependencies
}

resource "google_cloudfunctions_function" "submit_new_page" {
  name                         = "${var.environment}-submit-new-page"
  runtime                      = var.cloud_functions_runtime
  entry_point                  = "submitNewPage"
  source_archive_bucket        = google_storage_bucket.gcf_source_bucket.name
  source_archive_object        = google_storage_bucket_object.submit_new_page.name
  trigger_http                 = true
  https_trigger_security_level = var.https_security_level
  service_account_email        = local.cloud_function_runtime_service_account_email
  region                       = var.region

  environment_variables = local.cloud_function_environment


  depends_on = local.cloud_function_http_dependencies
}

resource "google_cloudfunctions_function_iam_member" "submit_new_story_invoker" {
  project        = var.project_id
  region         = var.region
  cloud_function = google_cloudfunctions_function.submit_new_story.name
  role           = local.cloud_functions_invoker_role
  member         = local.all_users_member
  depends_on = [
    google_cloudfunctions_function.submit_new_story,
    google_project_iam_member.terraform_service_account_roles["terraform_cloudfunctions_viewer"],
  ]
}

resource "google_cloudfunctions_function_iam_member" "submit_new_page_invoker" {
  project        = var.project_id
  region         = var.region
  cloud_function = google_cloudfunctions_function.submit_new_page.name
  role           = local.cloud_functions_invoker_role
  member         = local.all_users_member
  depends_on = [
    google_cloudfunctions_function.submit_new_page,
    google_project_iam_member.terraform_service_account_roles["terraform_cloudfunctions_viewer"],
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
  service_account_email        = local.cloud_function_runtime_service_account_email
  region                       = var.region

  environment_variables = local.cloud_function_environment

  depends_on = local.cloud_function_http_dependencies
}

resource "google_cloudfunctions_function_iam_member" "assign_moderation_job_invoker" {
  project        = var.project_id
  region         = var.region
  cloud_function = google_cloudfunctions_function.assign_moderation_job.name
  role           = local.cloud_functions_invoker_role
  member         = local.all_users_member
  depends_on = [
    google_cloudfunctions_function.assign_moderation_job,
    google_project_iam_member.terraform_service_account_roles["terraform_cloudfunctions_viewer"],
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
  service_account_email        = local.cloud_function_runtime_service_account_email
  region                       = var.region

  environment_variables = local.cloud_function_environment

  depends_on = local.cloud_function_http_dependencies
}

resource "google_cloudfunctions_function_iam_member" "get_moderation_variant_invoker" {
  project        = var.project_id
  region         = var.region
  cloud_function = google_cloudfunctions_function.get_moderation_variant.name
  role           = local.cloud_functions_invoker_role
  member         = local.all_users_member

  depends_on = [
    google_cloudfunctions_function.get_moderation_variant,
    google_project_iam_member.terraform_service_account_roles["terraform_cloudfunctions_viewer"],
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
  service_account_email        = local.cloud_function_runtime_service_account_email
  region                       = var.region

  environment_variables = local.cloud_function_environment

  depends_on = local.cloud_function_http_dependencies
}

resource "google_cloudfunctions_function_iam_member" "submit_moderation_rating_invoker" {
  project        = var.project_id
  region         = var.region
  cloud_function = google_cloudfunctions_function.submit_moderation_rating.name
  role           = local.cloud_functions_invoker_role
  member         = local.all_users_member
  depends_on = [
    google_cloudfunctions_function.submit_moderation_rating,
    google_project_iam_member.terraform_service_account_roles["terraform_cloudfunctions_viewer"],
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
  service_account_email        = local.cloud_function_runtime_service_account_email
  region                       = var.region

  environment_variables = local.cloud_function_environment

  depends_on = local.cloud_function_http_dependencies
}

resource "google_cloudfunctions_function_iam_member" "report_for_moderation_invoker" {
  project        = var.project_id
  region         = var.region
  cloud_function = google_cloudfunctions_function.report_for_moderation.name
  role           = local.cloud_functions_invoker_role
  member         = local.all_users_member
  depends_on = [
    google_cloudfunctions_function.report_for_moderation,
    google_project_iam_member.terraform_service_account_roles["terraform_cloudfunctions_viewer"],
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

  service_account_email = local.cloud_function_runtime_service_account_email

  environment_variables = local.cloud_function_environment


  event_trigger {
    event_type = "providers/cloud.firestore/eventTypes/document.create"
    resource   = "${local.firestore_documents_path}/storyFormSubmissions/{subId}"
  }

  depends_on = local.cloud_function_event_dependencies
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

  service_account_email = local.cloud_function_runtime_service_account_email

  environment_variables = local.cloud_function_environment

  event_trigger {
    event_type = "providers/cloud.firestore/eventTypes/document.create"
    resource   = "${local.firestore_documents_path}/moderationRatings/{ratingId}"
  }

  depends_on = local.cloud_function_event_dependencies
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

  service_account_email = local.cloud_function_runtime_service_account_email

  environment_variables = local.cloud_function_environment


  event_trigger {
    event_type = "providers/cloud.firestore/eventTypes/document.create"
    resource   = "${local.firestore_documents_path}/pageFormSubmissions/{subId}"
  }

  depends_on = local.cloud_function_event_dependencies
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

  service_account_email = local.cloud_function_runtime_service_account_email

  environment_variables = local.cloud_function_environment


  event_trigger {
    event_type = "providers/cloud.firestore/eventTypes/document.write"
    resource   = "${local.firestore_documents_path}/stories/{storyId}/pages/{pageId}/variants/{variantId}"
  }

  depends_on = local.cloud_function_event_dependencies
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

  service_account_email = local.cloud_function_runtime_service_account_email

  environment_variables = local.cloud_function_environment

  event_trigger {
    event_type = "providers/cloud.firestore/eventTypes/document.write"
    resource   = "${local.firestore_documents_path}/stories/{storyId}/pages/{pageId}/variants/{variantId}"
  }

  depends_on = local.cloud_function_event_dependencies
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
  service_account_email        = local.cloud_function_runtime_service_account_email
  region                       = var.region

  environment_variables = local.cloud_function_environment

  depends_on = local.cloud_function_http_dependencies
}

resource "google_cloudfunctions_function_iam_member" "mark_variant_dirty_invoker" {
  project        = var.project_id
  region         = var.region
  cloud_function = google_cloudfunctions_function.mark_variant_dirty.name
  role           = local.cloud_functions_invoker_role
  member         = local.all_users_member
  depends_on = [
    google_cloudfunctions_function.mark_variant_dirty,
    google_project_iam_member.terraform_service_account_roles["terraform_cloudfunctions_viewer"],
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
  service_account_email        = local.cloud_function_runtime_service_account_email
  region                       = var.region

  environment_variables = local.cloud_function_environment

  depends_on = local.cloud_function_http_dependencies
}

resource "google_cloudfunctions_function_iam_member" "generate_stats_invoker" {
  project        = var.project_id
  region         = var.region
  cloud_function = google_cloudfunctions_function.generate_stats.name
  role           = local.cloud_functions_invoker_role
  member         = local.all_users_member
  depends_on = [
    google_cloudfunctions_function.generate_stats,
    google_project_iam_member.terraform_service_account_roles["terraform_cloudfunctions_viewer"],
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
    google_project_service.project_level,
    google_cloudfunctions_function.generate_stats,
    google_project_iam_member.terraform_service_account_roles["terraform_cloudscheduler_admin"],
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

  service_account_email = local.cloud_function_runtime_service_account_email

  environment_variables = local.cloud_function_environment


  event_trigger {
    event_type = "providers/cloud.firestore/eventTypes/document.create"
    resource   = "${local.firestore_documents_path}/stories/{storyId}"
  }

  depends_on = local.cloud_function_event_dependencies
}

resource "google_cloudfunctions_function" "trigger_render_contents" {
  name                         = "${var.environment}-trigger-render-contents"
  runtime                      = var.cloud_functions_runtime
  entry_point                  = "triggerRenderContents"
  source_archive_bucket        = google_storage_bucket.gcf_source_bucket.name
  source_archive_object        = google_storage_bucket_object.render_contents.name
  trigger_http                 = true
  https_trigger_security_level = var.https_security_level
  service_account_email        = local.cloud_function_runtime_service_account_email
  region                       = var.region

  environment_variables = local.cloud_function_environment

  depends_on = local.cloud_function_http_dependencies
}

resource "google_cloudfunctions_function_iam_member" "trigger_render_contents_invoker" {
  project        = var.project_id
  region         = var.region
  cloud_function = google_cloudfunctions_function.trigger_render_contents.name
  role           = local.cloud_functions_invoker_role
  member         = local.all_users_member
  depends_on = [
    google_cloudfunctions_function.trigger_render_contents,
    google_project_iam_member.terraform_service_account_roles["terraform_cloudfunctions_viewer"],
  ]
}
