locals {
  playwright_enabled  = startswith(var.environment, "t-")
  playwright_job_name = "pw-e2e-${var.environment}"
}

resource "google_service_account" "playwright" {
  count = local.playwright_enabled ? 1 : 0

  account_id   = local.playwright_job_name
  display_name = "Playwright E2E runner (${var.environment})"
}

resource "google_service_account_iam_member" "tf_can_actas_playwright" {
  count = local.playwright_enabled ? 1 : 0

  service_account_id = google_service_account.playwright[0].name
  role               = "roles/iam.serviceAccountUser"
  member             = local.terraform_service_account_member
}

resource "google_project_iam_member" "pw_artifact_pull" {
  count = local.playwright_enabled ? 1 : 0

  project = var.project_id
  role    = "roles/artifactregistry.reader"
  member  = "serviceAccount:${google_service_account.playwright[0].email}"
}

resource "google_project_iam_member" "tf_run_admin" {
  count = local.playwright_enabled ? 1 : 0

  project = var.project_id
  role    = "roles/run.admin"
  member  = local.terraform_service_account_member
}

resource "google_cloud_run_v2_job" "playwright" {
  count = local.playwright_enabled ? 1 : 0

  name     = local.playwright_job_name
  location = var.region

  template {
    task_count  = 1
    parallelism = 1

    template {
      service_account = google_service_account.playwright[0].email

      containers {
        image = var.playwright_image
      }

      timeout     = "600s"
      max_retries = 0
    }
  }

  depends_on = [
    google_service_account_iam_member.tf_can_actas_playwright,
    google_project_iam_member.tf_run_admin,
  ]
}
