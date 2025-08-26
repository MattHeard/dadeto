# Firebase Authentication setup

# identity-toolkit = Firebase Auth backend

resource "google_firebase_project" "core" {
  provider   = google-beta
  project    = var.project_id
  depends_on = [
    google_project_service.enabled["firebase.googleapis.com"],
    google_project_service.enabled["identitytoolkit.googleapis.com"],
  ]
}

resource "google_firebase_web_app" "frontend" {
  provider     = google-beta
  project      = var.project_id
  display_name = "Dadeto Frontend"
}

# Expose the JS SDK config
data "google_firebase_web_app_config" "frontend" {
  provider   = google-beta
  project    = var.project_id
  web_app_id = google_firebase_web_app.frontend.app_id
}

locals {
  firebase_web_app_config = {
    apiKey            = data.google_firebase_web_app_config.frontend.api_key
    authDomain        = data.google_firebase_web_app_config.frontend.auth_domain
    projectId         = var.project_id
    storageBucket     = data.google_firebase_web_app_config.frontend.storage_bucket
    messagingSenderId = data.google_firebase_web_app_config.frontend.messaging_sender_id
    appId             = google_firebase_web_app.frontend.app_id
    measurementId     = data.google_firebase_web_app_config.frontend.measurement_id
  }
}

resource "google_identity_platform_config" "auth" {
  provider                 = google-beta
  project                  = var.project_id
  autodelete_anonymous_users = true

  authorized_domains = [
    "dendritestories.co.nz",
    "www.dendritestories.co.nz",
    "mattheard.net",
    "localhost",
  ]
}

resource "google_identity_platform_default_supported_idp_config" "google" {
  provider      = google-beta
  project       = var.project_id
  idp_id        = "google.com"
  client_id     = var.google_oauth_client_id
  client_secret = var.google_oauth_client_secret
  enabled       = true

  # ensure API has finished provisioning before this runs
  depends_on = [google_identity_platform_config.auth]
}

resource "google_identity_platform_oauth_idp_config" "gis_allowlist" {
  provider     = google-beta
  count        = var.gis_one_tap_client_id == "" ? 0 : 1
  project      = var.project_id
  name         = "projects/${var.project_id}/oauthIdpConfigs/google.com"
  issuer       = "https://accounts.google.com"
  display_name = "GIS One-Tap"
  client_id    = var.gis_one_tap_client_id
  enabled      = true
}
