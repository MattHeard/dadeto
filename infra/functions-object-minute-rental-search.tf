data "archive_file" "object_minute_rental_search_src" {
  type        = "zip"
  source_dir  = "${path.module}/cloud-functions/object-minute-rental-search"
  output_path = "${path.module}/build/object-minute-rental-search.zip"
}

resource "google_storage_bucket" "object_minute_rental_schedule" {
  name     = "${var.environment}-object-minute-rental-schedules"
  location = var.region
}

resource "google_storage_bucket_object" "object_minute_rental_schedule" {
  name         = "runner-schedule.json"
  bucket       = google_storage_bucket.object_minute_rental_schedule.name
  source       = "${path.module}/object-minute-rental-schedule.json"
  content_type = "application/json"

  lifecycle {
    ignore_changes = [source, content]
  }
}

resource "google_storage_bucket_iam_member" "object_minute_rental_schedule_reader" {
  bucket = google_storage_bucket.object_minute_rental_schedule.name
  role   = local.storage_object_viewer_role
  member = local.cloud_function_runtime_service_account_member
}

resource "google_storage_bucket_object" "object_minute_rental_search_zip" {
  name   = "${var.environment}-object-minute-rental-search-${data.archive_file.object_minute_rental_search_src.output_sha256}.zip"
  bucket = google_storage_bucket.gcf_source_bucket.name
  source = data.archive_file.object_minute_rental_search_src.output_path
}

resource "google_cloudfunctions2_function" "object_minute_rental_search" {
  name     = "${var.environment}-object-minute-rental-search"
  location = var.region

  build_config {
    runtime     = "nodejs22"
    entry_point = "handle"
    source {
      storage_source {
        bucket = google_storage_bucket.gcf_source_bucket.name
        object = google_storage_bucket_object.object_minute_rental_search_zip.name
      }
    }
  }

  service_config {
    available_memory      = "256M"
    timeout_seconds       = 15
    max_instance_count    = 20
    service_account_email = local.cloud_function_runtime_service_account_email
    environment_variables = merge(local.cloud_function_environment, {
      SEARCH_DELIVERY_OUTBOUND_SECONDS = "2700"
      SEARCH_PROCUREMENT_SECONDS       = "1800"
      SEARCH_PICKUP_RETURN_SECONDS     = "2700"
      SEARCH_SUPPLIER_START            = "07:00"
      SEARCH_SUPPLIER_END              = "17:00"
      SEARCH_RUNNER_ID                 = "RUNNER-1"
      SEARCH_SCHEDULE_BUCKET           = google_storage_bucket.object_minute_rental_schedule.name
      SEARCH_SCHEDULE_OBJECT           = google_storage_bucket_object.object_minute_rental_schedule.name
      SEARCH_SUPPLIER_TIME_ZONE        = "Europe/Berlin"
      SEARCH_ALLOWED_ORIGINS           = "https://mattheard.net"
    })
  }

  depends_on = [
    google_project_service.project_level,
    google_project_iam_member.terraform_service_account_roles["cloudfunctions_access"],
    google_service_account_iam_member.terraform_can_impersonate_runtime,
  ]
}

resource "google_cloud_run_service_iam_member" "object_minute_rental_search_public" {
  location = google_cloudfunctions2_function.object_minute_rental_search.location
  service  = google_cloudfunctions2_function.object_minute_rental_search.name
  role     = "roles/run.invoker"
  member   = local.all_users_member
}

output "object_minute_rental_search_url" {
  description = "Test-environment URL for the read-only object-minute rental search function"
  value       = google_cloudfunctions2_function.object_minute_rental_search.service_config[0].uri
}
