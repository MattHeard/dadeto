###############################################################################
#  firebase-api-key.tf
#
#  Manage Firebase Web API key service configuration
###############################################################################

# Allow Terraform to create / update / delete API keys
resource "google_project_iam_member" "terraform_apikeys_admin" {
  project = var.project_id
  role    = "roles/serviceusage.apiKeysAdmin"
  member  = "serviceAccount:terraform@${var.project_id}.iam.gserviceaccount.com"

  depends_on = [google_project_service.apis["apikeys.googleapis.com"]]
}

