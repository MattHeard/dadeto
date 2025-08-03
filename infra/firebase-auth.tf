# Firebase Authentication setup

# identity-toolkit = Firebase Auth backend
resource "google_project_service" "identitytoolkit" {
  project = var.project_id
  service = "identitytoolkit.googleapis.com"
}

# firebase.googleapis.com upgrades the project to Firebase
resource "google_project_service" "firebase_api" {
  project = var.project_id
  service = "firebase.googleapis.com"
}

resource "google_firebase_project" "core" {
  project    = var.project_id
  depends_on = [
    google_project_service.firebase_api,
    google_project_service.identitytoolkit,
  ]
}

resource "google_firebase_web_app" "frontend" {
  project      = var.project_id
  display_name = "Dadeto Frontend"
}

# Expose the JS SDK config
resource "google_firebase_web_app_config" "frontend" {
  project = var.project_id
  app_id  = google_firebase_web_app.frontend.app_id
}

resource "google_identity_platform_config" "auth" {
  project                   = var.project_id
  autodelete_anonymous_users = true

  authorized_domains = [
    "dendritestories.co.nz",
    "www.dendritestories.co.nz",
    "mattheard.net",
    "localhost",
  ]
}

resource "google_identity_platform_default_supported_idp_config" "google" {
  project      = var.project_id
  provider     = "google.com"
  client_id     = var.google_oauth_client_id
  client_secret = var.google_oauth_client_secret
  enabled       = true
}

resource "google_identity_platform_oauth_idp_config" "gis_allowlist" {
  count       = var.gis_one_tap_client_id == "" ? 0 : 1
  project      = var.project_id
  provider     = "google.com"
  display_name = "GIS One-Tap"
  client_id    = var.gis_one_tap_client_id
  enabled      = true
}
