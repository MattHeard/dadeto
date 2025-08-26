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
  source = "${path.module}/static/hello-world.txt"
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
    prevent_destroy = true # prod safety belt
  }
}


resource "google_storage_bucket_object" "dendrite_404" {
  name          = "404.html"
  bucket        = google_storage_bucket.dendrite_static.name
  source        = "${path.module}/static/404.html"
  content_type  = "text/html"
  cache_control = "no-store"
}

resource "google_storage_bucket_object" "dendrite_new_story" {
  name         = "new-story.html"
  bucket       = google_storage_bucket.dendrite_static.name
  source       = "${path.module}/static/new-story.html"
  content_type = "text/html"
}

resource "google_storage_bucket_object" "dendrite_new_page" {
  name         = "new-page.html"
  bucket       = google_storage_bucket.dendrite_static.name
  source       = "${path.module}/static/new-page.html"
  content_type = "text/html"
}

resource "google_storage_bucket_object" "dendrite_about" {
  name         = "about.html"
  bucket       = google_storage_bucket.dendrite_static.name
  source       = "${path.module}/static/about.html"
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
  content = templatefile("${path.module}/static/mod.html", {
    firebase_web_app_config = jsonencode(local.firebase_web_app_config)
  })
  content_type = "text/html"
}

resource "google_storage_bucket_object" "dendrite_google_auth_js" {
  name         = "googleAuth.js"
  bucket       = google_storage_bucket.dendrite_static.name
  source       = "${path.module}/static/googleAuth.js"
  content_type = "application/javascript"
}

resource "google_storage_bucket_object" "dendrite_moderate_js" {
  name         = "moderate.js"
  bucket       = google_storage_bucket.dendrite_static.name
  source       = "${path.module}/static/moderate.js"
  content_type = "application/javascript"
}

resource "google_storage_bucket_object" "dendrite_admin_html" {
  name         = "admin.html"
  bucket       = google_storage_bucket.dendrite_static.name
  source       = "${path.module}/static/admin.html"
  content_type = "text/html"
}

resource "google_storage_bucket_object" "dendrite_admin_js" {
  name         = "admin.js"
  bucket       = google_storage_bucket.dendrite_static.name
  source       = "${path.module}/static/admin.js"
  content_type = "application/javascript"
}

resource "google_storage_bucket_object" "dendrite_css" {
  name         = "dendrite.css"
  bucket       = google_storage_bucket.dendrite_static.name
  source       = "${path.module}/static/dendrite.css"
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
  name     = "gcf-source-${var.project_id}-${var.region}"
  location = var.region

  uniform_bucket_level_access = true
  force_destroy               = true
}

resource "google_firestore_database" "default" {
  project     = var.project_id
  name        = "(default)"
  location_id = var.region
  type        = "FIRESTORE_NATIVE"
  depends_on  = [google_project_service.apis["firestore.googleapis.com"]]
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

resource "google_service_account" "cloud_function_runtime" {
  account_id   = "${var.environment}-cloud-function-runtime"
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
    google_project_service.apis["firestore.googleapis.com"]
  ]
}

locals {
  default_env_vars = {
    GCLOUD_PROJECT       = var.project_id
    GOOGLE_CLOUD_PROJECT = var.project_id
    FIREBASE_CONFIG      = jsonencode({ projectId = var.project_id })
  }

  cloud_functions = {
    get_api_key_credit = {
      entry_point = "handler"
      source_dir  = "${path.module}/cloud-functions/get-api-key-credit"
      trigger     = { http = true }
      iam_members = [{ role = "roles/cloudfunctions.invoker", member = "allUsers" }]
    }
    submit_new_story = {
      entry_point = "submitNewStory"
      source_dir  = "${path.module}/cloud-functions/submit-new-story"
      trigger     = { http = true }
      iam_members = [{ role = "roles/cloudfunctions.invoker", member = "allUsers" }]
    }
    submit_new_page = {
      entry_point = "submitNewPage"
      source_dir  = "${path.module}/cloud-functions/submit-new-page"
      trigger     = { http = true }
      iam_members = [{ role = "roles/cloudfunctions.invoker", member = "allUsers" }]
    }
    assign_moderation_job = {
      entry_point = "assignModerationJob"
      source_dir  = "${path.module}/cloud-functions/assign-moderation-job"
      trigger     = { http = true }
      iam_members = [{ role = "roles/cloudfunctions.invoker", member = "allUsers" }]
    }
    get_moderation_variant = {
      entry_point = "getModerationVariant"
      source_dir  = "${path.module}/cloud-functions/get-moderation-variant"
      trigger = {
        event = {
          event_type = "providers/cloud.firestore/eventTypes/document.create"
          resource   = "projects/${var.project_id}/databases/(default)/documents/storyFormSubmissions/{subId}"
        }
      }
    }
    prod_update_variant_visibility = {
      entry_point = "prodUpdateVariantVisibility"
      source_dir  = "${path.module}/cloud-functions/prod-update-variant-visibility"
      trigger = {
        event = {
          event_type = "providers/cloud.firestore/eventTypes/document.create"
          resource   = "projects/${var.project_id}/databases/(default)/documents/moderationRatings/{ratingId}"
        }
      }
    }
    process_new_page = {
      entry_point = "processNewPage"
      source_dir  = "${path.module}/cloud-functions/process-new-page"
      trigger = {
        event = {
          event_type = "providers/cloud.firestore/eventTypes/document.create"
          resource   = "projects/${var.project_id}/databases/(default)/documents/pageFormSubmissions/{subId}"
        }
      }
    }
    render_variant = {
      entry_point = "renderVariant"
      source_dir  = "${path.module}/cloud-functions/render-variant"
      trigger = {
        event = {
          event_type = "providers/cloud.firestore/eventTypes/document.write"
          resource   = "projects/${var.project_id}/databases/(default)/documents/stories/{storyId}/pages/{pageId}/variants/{variantId}"
        }
      }
    }
    hide_variant_html = {
      entry_point = "hideVariantHtml"
      source_dir  = "${path.module}/cloud-functions/hide-variant-html"
      trigger = {
        event = {
          event_type = "providers/cloud.firestore/eventTypes/document.write"
          resource   = "projects/${var.project_id}/databases/(default)/documents/stories/{storyId}/pages/{pageId}/variants/{variantId}"
        }
      }
    }
    mark_variant_dirty = {
      entry_point = "markVariantDirty"
      source_dir  = "${path.module}/cloud-functions/mark-variant-dirty"
      trigger     = { http = true }
      iam_members = [{ role = "roles/cloudfunctions.invoker", member = "allUsers" }]
    }
    generate_stats = {
      entry_point = "generateStats"
      source_dir  = "${path.module}/cloud-functions/generate-stats"
      trigger     = { http = true }
      iam_members = [{ role = "roles/cloudfunctions.invoker", member = "allUsers" }]
    }
    render_contents = {
      entry_point = "renderContents"
      source_dir  = "${path.module}/cloud-functions/render-contents"
      trigger = {
        event = {
          event_type = "providers/cloud.firestore/eventTypes/document.create"
          resource   = "projects/${var.project_id}/databases/(default)/documents/stories/{storyId}"
        }
      }
    }
    trigger_render_contents = {
      entry_point = "triggerRenderContents"
      source_dir  = "${path.module}/cloud-functions/render-contents"
      trigger     = { http = true }
      iam_members = [{ role = "roles/cloudfunctions.invoker", member = "allUsers" }]
    }
  }
}

module "cloud_functions" {
  for_each = local.cloud_functions

  source = "./modules/cloud-function"

  name        = "${var.environment}-${each.key}"
  entry_point = each.value.entry_point
  source_dir  = each.value.source_dir
  trigger     = each.value.trigger
  env_vars    = merge(local.default_env_vars, lookup(each.value, "env_vars", {}))
  project_id  = var.project_id
  region      = var.region
  runtime     = var.cloud_functions_runtime
  source_bucket = google_storage_bucket.gcf_source_bucket.name
  service_account_email = google_service_account.cloud_function_runtime.email
  https_security_level = var.https_security_level
  iam_members = lookup(each.value, "iam_members", [])

  depends_on = [
    google_project_service.apis["cloudfunctions.googleapis.com"],
    google_project_service.apis["cloudbuild.googleapis.com"],
    google_project_iam_member.cloudfunctions_access,
    google_service_account_iam_member.terraform_can_impersonate_runtime,
    google_service_account_iam_member.terraform_can_impersonate_default_compute,
  ]
}

resource "google_cloud_scheduler_job" "generate_stats_daily" {
  name      = "${var.environment}-generate-stats-daily"
  schedule  = "0 0 * * *"
  time_zone = "UTC"
  http_target {
    http_method = "POST"
    uri         = module.cloud_functions["generate_stats"].https_trigger_url
    headers = {
      "X-Appengine-Cron" = "true"
    }
  }
  depends_on = [
    google_project_service.apis["cloudscheduler.googleapis.com"],
    module.cloud_functions["generate_stats"],
    google_project_iam_member.terraform_cloudscheduler_admin,
  ]
}
