# Firebase Authentication IAM roles for Terraform

resource "google_project_iam_member" "terraform_firebase_admin" {
  project = var.project_id
  role    = "roles/firebase.admin"             # can add Firebase to a project & manage web-apps
  member  = "serviceAccount:terraform@${var.project_id}.iam.gserviceaccount.com"
}

resource "google_project_iam_member" "terraform_serviceusage_admin" {
  project = var.project_id
  role    = "roles/serviceusage.serviceUsageAdmin"  # turns APIs on/off programmatically
  member  = "serviceAccount:terraform@${var.project_id}.iam.gserviceaccount.com"
}

# Allow the Cloud Function runtime SA to read auth users
resource "google_project_iam_member" "runtime_identityplatform_viewer" {
  project = var.project_id
  role    = "roles/identityplatform.viewer"   # just “view” permissions
  member  = "serviceAccount:${google_service_account.cloud_function_runtime.email}"

  # optional, but makes the dependency explicit
  depends_on = [
    google_project_service.enabled["identitytoolkit.googleapis.com"]       # turned on in firebase-auth.tf
  ]
}

