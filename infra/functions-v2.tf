data "archive_file" "get_api_key_credit_v2_src" {
  type        = "zip"
  source_dir  = "${path.module}/cloud-functions/get-api-key-credit-v2"
  output_path = "${path.module}/build/get-api-key-credit-v2.zip"
}

resource "google_storage_bucket_object" "get_api_key_credit_v2_zip" {
  name   = "${var.environment}-get-api-key-credit-v2-${data.archive_file.get_api_key_credit_v2_src.output_sha256}.zip"
  bucket = google_storage_bucket.gcf_source_bucket.name
  source = data.archive_file.get_api_key_credit_v2_src.output_path
}

resource "google_cloudfunctions2_function" "get_api_key_credit_v2" {
  name     = "${var.environment}-get-api-key-credit-v2"
  location = var.region

  build_config {
    runtime     = "nodejs22"
    entry_point = "getApiKeyCreditV2"
    source {
      storage_source {
        bucket = google_storage_bucket.gcf_source_bucket.name
        object = google_storage_bucket_object.get_api_key_credit_v2_zip.name
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
    google_service_account_iam_member.terraform_can_impersonate_default_compute,
  ]
}

resource "google_cloud_run_service_iam_member" "get_api_key_credit_v2_public" {
  location = google_cloudfunctions2_function.get_api_key_credit_v2.location
  service  = google_cloudfunctions2_function.get_api_key_credit_v2.name
  role     = local.cloud_run_invoker_role
  member   = local.all_users_member

  depends_on = [
    google_cloudfunctions2_function.get_api_key_credit_v2,
    google_project_iam_member.terraform_service_account_roles["terraform_cloudfunctions_viewer"],
  ]
}
