data "archive_file" "checkout_session_src" {
  type        = "zip"
  source_dir  = "${path.module}/cloud-functions/create-checkout-session"
  output_path = "${path.module}/build/create-checkout-session.zip"
}

resource "google_storage_bucket_object" "checkout_session_zip" {
  name   = "${var.environment}-create-checkout-session-${data.archive_file.checkout_session_src.output_sha256}.zip"
  bucket = google_storage_bucket.gcf_source_bucket.name
  source = data.archive_file.checkout_session_src.output_path
}

resource "google_cloudfunctions2_function" "checkout_session" {
  name     = "${var.environment}-create-checkout-session"
  location = var.region
  build_config {
    runtime = "nodejs22"
    entry_point = "handle"
    source {
      storage_source {
        bucket = google_storage_bucket.gcf_source_bucket.name
        object = google_storage_bucket_object.checkout_session_zip.name
      }
    }
  }
  service_config {
    available_memory = "256M"
    timeout_seconds = 30
    max_instance_count = 20
    service_account_email = local.cloud_function_runtime_service_account_email
    environment_variables = merge(local.cloud_function_environment, { PUBLIC_BILLING_ORIGIN = var.public_billing_origin })
    secret_environment_variables {
      key = "STRIPE_SECRET_KEY"
      project_id = var.project_id
      secret = local.runtime_secret_names.stripe_secret_key
      version = var.stripe_secret_key_version
    }
  }
  depends_on = [google_project_service.project_level, google_project_iam_member.terraform_service_account_roles["cloudfunctions_access"], google_service_account_iam_member.terraform_can_impersonate_runtime]
}

resource "google_cloud_run_service_iam_member" "checkout_session_public" {
  location = google_cloudfunctions2_function.checkout_session.location
  service = google_cloudfunctions2_function.checkout_session.name
  role = "roles/run.invoker"
  member = local.all_users_member
}
