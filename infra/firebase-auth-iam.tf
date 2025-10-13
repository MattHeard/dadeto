locals {
  terraform_identity_roles = {
    firebase_admin = "roles/firebase.admin"              # can add Firebase to a project & manage web-apps
    serviceusage_admin = "roles/serviceusage.serviceUsageAdmin" # turns APIs on/off programmatically
    identityplatform_admin = "roles/identityplatform.admin"     # manage tenants & other Identity Platform settings
  }
}

# Firebase Authentication IAM roles for Terraform
resource "google_project_iam_member" "terraform_identity_roles" {
  for_each = local.manage_project_level_resources ? local.terraform_identity_roles : {}

  project = var.project_id
  role    = each.value
  member  = local.terraform_service_account_member
}

# Allow the Cloud Function runtime SA to read auth users
resource "google_project_iam_member" "runtime_identityplatform_viewer" {
  project = var.project_id
  role    = "roles/identityplatform.viewer" # just "view" permissions
  member  = local.cloud_function_runtime_service_account_member

  # optional, but makes the dependency explicit
  depends_on = [
    google_project_service.identitytoolkit,
    google_service_account.cloud_function_runtime,
  ]
}
