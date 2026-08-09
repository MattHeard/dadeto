data "archive_file" "billing_src" {
  type        = "zip"
  source_dir  = "${path.module}/cloud-functions/billing"
  output_path = "${path.module}/build/billing.zip"
}

resource "google_storage_bucket_object" "billing_zip" {
  name   = "${var.environment}-billing-${data.archive_file.billing_src.output_sha256}.zip"
  bucket = google_storage_bucket.gcf_source_bucket.name
  source = data.archive_file.billing_src.output_path
}

resource "google_cloudfunctions2_function" "billing" {
  name     = "${var.environment}-billing-packages"
  location = var.region

  build_config {
    runtime     = "nodejs22"
    entry_point = "handle"
    source {
      storage_source {
        bucket = google_storage_bucket.gcf_source_bucket.name
        object = google_storage_bucket_object.billing_zip.name
      }
    }
  }

  service_config {
    available_memory      = "256M"
    timeout_seconds       = 10
    max_instance_count    = 20
    service_account_email = local.cloud_function_runtime_service_account_email
    environment_variables = local.cloud_function_environment
  }

  depends_on = [
    google_project_service.project_level,
    google_project_iam_member.terraform_service_account_roles["cloudfunctions_access"],
    google_service_account_iam_member.terraform_can_impersonate_runtime,
  ]
}

resource "google_cloud_run_service_iam_member" "billing_public" {
  location = google_cloudfunctions2_function.billing.location
  service  = google_cloudfunctions2_function.billing.name
  role     = "roles/run.invoker"
  member   = local.all_users_member
  depends_on = [google_cloudfunctions2_function.billing]
}
