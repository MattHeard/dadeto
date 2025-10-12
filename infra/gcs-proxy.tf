resource "google_project_iam_member" "gcs_proxy_runtime_viewer" {
  count = local.playwright_enabled ? 1 : 0

  project = var.project_id
  role    = local.storage_object_viewer_role
  member  = local.cloud_function_runtime_service_account_member
}
