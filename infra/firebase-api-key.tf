###############################################################################
#  firebase-api-key.tf
#
#  Restrict the public Firebase Web API key                           (browser)
###############################################################################

# Allow Terraform to create / update / delete API keys
resource "google_project_iam_member" "terraform_apikeys_admin" {
  project = var.project_id
  role    = "roles/serviceusage.apiKeysAdmin"
  member  = "serviceAccount:terraform@${var.project_id}.iam.gserviceaccount.com"
}

# Existing Firebase Web API key
resource "google_project_service" "apikeys_api" {
  project = var.project_id
  service = "apikeys.googleapis.com"
}

resource "google_apikeys_key" "firebase_web" {
  name         = "projects/${var.project_id}/locations/global/keys/e1d641f2-a5f5-4ab1-8fac-3bab75f15cb9"
  display_name = "Firebase Web key (browser)"

  restrictions {
    api_targets {
      service = "identitytoolkit.googleapis.com"
    }
    api_targets {
      service = "securetoken.googleapis.com"
    }

    browser_key_restrictions {
      allowed_referrers = [
        "https://www.dendritestories.co.nz/*",
        "https://dendritestories.co.nz/*",
        "http://localhost:5173/*",
        "http://localhost:3000/*",
      ]
    }
  }

  depends_on = [google_project_service.apikeys_api]
}
