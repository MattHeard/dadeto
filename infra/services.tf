locals {
  required_apis = toset([
    "firestore.googleapis.com",
    "cloudfunctions.googleapis.com",
    "cloudbuild.googleapis.com",
    "cloudscheduler.googleapis.com",
    "firebaserules.googleapis.com",
    "run.googleapis.com",
    "artifactregistry.googleapis.com",
    "eventarc.googleapis.com",
    "compute.googleapis.com",
    "apikeys.googleapis.com",
    "identitytoolkit.googleapis.com",
    "firebase.googleapis.com",
  ])
}

resource "google_project_service" "enabled" {
  for_each = local.required_apis
  project  = var.project_id
  service  = each.key

  disable_on_destroy = each.key == "compute.googleapis.com" ? false : true
}
