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

  depends_on = [google_project_service.apikeys_api]
}

# Public Firebase Web API key
resource "google_project_service" "apikeys_api" {
  project = var.project_id
  service = "apikeys.googleapis.com"
}

resource "google_apikeys_key" "public_web" {
  display_name = "Dadeto Public Web key (browser)"

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

  lifecycle {
    # 🔑 make Terraform destroy the old key first – and only then create the replacement
    create_before_destroy = false
  }

  depends_on = [
    google_project_iam_member.terraform_apikeys_admin,  # wait for the role
    google_project_service.apikeys_api                  # and the API itself
  ]
}
