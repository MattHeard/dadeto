data "archive_file" "openai_chat_src" {
  type        = "zip"
  source_dir  = "${path.module}/cloud-functions/openai-chat"
  output_path = "${path.module}/build/openai-chat.zip"
}

resource "google_storage_bucket_object" "openai_chat_zip" {
  name   = "${var.environment}-openai-chat-${data.archive_file.openai_chat_src.output_sha256}.zip"
  bucket = google_storage_bucket.gcf_source_bucket.name
  source = data.archive_file.openai_chat_src.output_path
}

resource "google_cloudfunctions2_function" "openai_chat" {
  name     = "${var.environment}-openai-chat"
  location = var.region

  build_config {
    runtime     = "nodejs22"
    entry_point = "handle"
    source {
      storage_source {
        bucket = google_storage_bucket.gcf_source_bucket.name
        object = google_storage_bucket_object.openai_chat_zip.name
      }
    }
  }

  service_config {
    available_memory      = "256M"
    timeout_seconds       = 30
    max_instance_count    = 5
    service_account_email = local.cloud_function_runtime_service_account_email
    environment_variables = merge(local.cloud_function_environment, {
      OPENAI_CHAT_ENABLED = tostring(var.openai_chat_enabled && var.billing_enabled)
    })

    dynamic "secret_environment_variables" {
      for_each = var.environment == "prod" ? [1] : []
      content {
        key        = "OPENAI_API_KEY"
        project_id = var.project_id
        secret     = local.runtime_secret_names.openai_api_key
        version    = var.openai_api_key_version
      }
    }
  }

  depends_on = [
    google_project_service.project_level,
    google_project_iam_member.terraform_service_account_roles["cloudfunctions_access"],
    google_service_account_iam_member.terraform_can_impersonate_runtime,
  ]
}

resource "google_cloud_run_service_iam_member" "openai_chat_public" {
  location = google_cloudfunctions2_function.openai_chat.location
  service  = google_cloudfunctions2_function.openai_chat.name
  role     = "roles/run.invoker"
  member   = local.all_users_member

  depends_on = [
    google_cloudfunctions2_function.openai_chat,
    google_project_iam_member.terraform_service_account_roles["terraform_cloudfunctions_viewer"],
  ]
}

output "openai_chat_url" {
  description = "URL for the Firebase-authenticated, credit-billed OpenAI chat endpoint"
  value       = google_cloudfunctions2_function.openai_chat.service_config[0].uri
}

resource "google_firestore_field" "openai_chat_result_expiry" {
  count      = local.manage_firestore_indexes ? 1 : 0
  project    = var.project_id
  database   = var.database_id
  collection = "openai-chat-results"
  field      = "expiresAt"

  # Idempotency responses are retained for 24 hours by the Firestore adapter.
  ttl_config {}

  depends_on = [google_firestore_database.database]
}
