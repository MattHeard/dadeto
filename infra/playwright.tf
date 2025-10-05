locals {
  playwright_enabled = startswith(var.environment, "t-")
  playwright_job_name = "pw-e2e-${var.environment}"
}

resource "google_service_account" "playwright" {
  count = local.playwright_enabled ? 1 : 0

  account_id   = local.playwright_job_name
  display_name = "Playwright E2E runner (${var.environment})"
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
}
