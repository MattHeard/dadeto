###############################################################################
#  firebase-api-key.tf
#
#  Manage Firebase Web API key service configuration
###############################################################################

# Allow Terraform to create / update / delete API keys
resource "google_project_iam_member" "terraform_apikeys_admin" {
  count   = local.manage_project_level_resources ? 1 : 0
  project = var.project_id
  role    = "roles/serviceusage.apiKeysAdmin"
  member  = "serviceAccount:terraform@${var.project_id}.iam.gserviceaccount.com"

  depends_on = [
    google_project_service.apikeys_api,
  ]
}
resource "google_project_service" "apikeys_api" {
  count              = local.manage_project_level_resources ? 1 : 0
  project            = var.project_id
  service            = "apikeys.googleapis.com"
  disable_on_destroy = false
}

