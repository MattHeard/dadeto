data "archive_file" "src" {
  type        = "zip"
  source_dir  = var.source_dir
  output_path = "${path.module}/tmp/${var.name}.zip"
}

resource "google_storage_bucket_object" "source" {
  name   = "${var.name}-${data.archive_file.src.output_sha256}.zip"
  bucket = var.source_bucket
  source = data.archive_file.src.output_path
}

resource "google_cloudfunctions2_function" "function" {
  name     = var.name
  location = var.region

  build_config {
    runtime     = var.runtime
    entry_point = var.entry_point
    source {
      storage_source {
        bucket = var.source_bucket
        object = google_storage_bucket_object.source.name
      }
    }
  }

  service_config {
    service_account_email = var.service_account_email
    environment_variables = var.env_vars
  }

  dynamic "event_trigger" {
    for_each = try(var.trigger.event, null) == null ? [] : [var.trigger.event]
    content {
      event_type = event_trigger.value.event_type
      trigger_region = var.region
      resource   = event_trigger.value.resource
    }
  }
}

resource "google_cloud_run_service_iam_member" "members" {
  for_each = { for idx, m in var.iam_members : idx => m }
  location = var.region
  service  = google_cloudfunctions2_function.function.name
  role     = each.value.role
  member   = each.value.member
  depends_on = [google_cloudfunctions2_function.function]
}
