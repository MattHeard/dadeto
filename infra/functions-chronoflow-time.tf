data "archive_file" "chronoflow_time_src" {
  type        = "zip"
  source_dir  = "${path.module}/cloud-functions/chronoflow-time"
  output_path = "${path.module}/build/chronoflow-time.zip"
}

resource "google_storage_bucket_object" "chronoflow_time_zip" {
  name   = "${var.environment}-chronoflow-time-${data.archive_file.chronoflow_time_src.output_sha256}.zip"
  bucket = google_storage_bucket.gcf_source_bucket.name
  source = data.archive_file.chronoflow_time_src.output_path
}

resource "google_cloudfunctions_function" "chronoflow_time" {
  name                         = "${var.environment}-chronoflow-time"
  description                  = "Returns uncached authoritative Internet time for Chronoflow"
  runtime                      = var.cloud_functions_runtime
  available_memory_mb          = 128
  source_archive_bucket        = google_storage_bucket.gcf_source_bucket.name
  source_archive_object        = google_storage_bucket_object.chronoflow_time_zip.name
  entry_point                  = "handle"
  trigger_http                 = true
  https_trigger_security_level = var.https_security_level
  service_account_email        = local.cloud_function_runtime_service_account_email
  region                       = var.region

  depends_on = [
    google_project_service.project_level,
    google_project_iam_member.terraform_service_account_roles["cloudfunctions_access"],
    google_service_account_iam_member.terraform_can_impersonate_runtime,
  ]
}

resource "google_cloudfunctions_function_iam_member" "chronoflow_time_invoker" {
  project        = var.project_id
  region         = var.region
  cloud_function = google_cloudfunctions_function.chronoflow_time.name
  role           = local.cloud_functions_invoker_role
  member         = local.all_users_member
  depends_on     = [google_cloudfunctions_function.chronoflow_time]
}

output "chronoflow_time_url" {
  description = "Test-environment URL for the Chronoflow authoritative network-time endpoint"
  value       = google_cloudfunctions_function.chronoflow_time.https_trigger_url
}
