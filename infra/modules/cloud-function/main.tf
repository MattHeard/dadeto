locals {
  trigger_http = coalesce(var.trigger.http, false)
  use_event    = !local.trigger_http && var.trigger.event != null
}

# Package source into an archive object
data "archive_file" "src" {
  type        = "zip"
  source_dir  = var.source_dir
  output_path = "${path.module}/.tmp/${var.name}.zip"
}

resource "google_storage_bucket_object" "src" {
  name   = "${var.name}-${data.archive_file.src.output_md5}.zip"
  bucket = var.source_bucket
  source = data.archive_file.src.output_path
}

resource "google_cloudfunctions_function" "function" {
  name        = var.name
  region      = var.region
  runtime     = var.runtime
  entry_point = var.entry_point

  service_account_email = var.service_account_email
  available_memory_mb   = 256

  source_archive_bucket = var.source_bucket
  source_archive_object = google_storage_bucket_object.src.name

  environment_variables = var.env_vars

  # Only include ONE of these trigger configs
  trigger_http = local.trigger_http ? true : null

  dynamic "event_trigger" {
    for_each = local.use_event ? [1] : []
    content {
      event_type = var.trigger.event.event_type
      resource   = var.trigger.event.resource
      retry      = try(var.trigger.event.retry, null)
    }
  }

  https_trigger_security_level = local.trigger_http ? var.https_security_level : null
}

resource "google_cloudfunctions_function_iam_member" "this" {
  for_each       = { for i, m in var.iam_members : i => m }
  project        = var.project_id
  region         = var.region
  cloud_function = google_cloudfunctions_function.function.name
  role           = each.value.role
  member         = each.value.member
}
