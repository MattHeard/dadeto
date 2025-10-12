locals {
  playwright_enabled          = startswith(var.environment, "t-")
  playwright_job_name         = "pw-e2e-${var.environment}"
  reports_bucket_name         = "${var.project_id}-${var.region}-e2e-reports"
  report_prefix               = trimspace(var.github_run_id) != "" ? "${var.environment}/${var.github_run_id}" : var.environment
  gcs_proxy_name              = "${var.environment}-gcs-proxy"
  gcs_proxy_uri               = local.playwright_enabled ? format("http://%s", google_compute_address.gcs_proxy_ilb_ip[0].address) : null
  playwright_vpc_connector_id = try(google_vpc_access_connector.playwright[0].id, null)
}

resource "google_project_service" "playwright_vpc_access" {
  count = local.playwright_enabled ? 1 : 0

  project            = var.project_id
  service            = "vpcaccess.googleapis.com"
  disable_on_destroy = false
}

data "google_compute_network" "playwright" {
  count = local.playwright_enabled ? 1 : 0

  name    = var.playwright_network_name
  project = var.project_id
}

data "google_compute_subnetwork" "playwright" {
  count = local.playwright_enabled ? 1 : 0

  name    = var.playwright_subnetwork_name
  region  = var.region
  project = var.project_id
}

resource "google_compute_subnetwork" "playwright_proxy_only" {
  count = local.playwright_enabled ? 1 : 0

  name          = "${var.environment}-playwright-proxy"
  region        = var.region
  network       = data.google_compute_network.playwright[0].id
  ip_cidr_range = var.playwright_proxy_subnet_cidr
  purpose       = "REGIONAL_MANAGED_PROXY"
  role          = "ACTIVE"

  depends_on = [google_project_iam_member.terraform_service_account_vpcaccess_admin]
}

resource "google_vpc_access_connector" "playwright" {
  count = local.playwright_enabled ? 1 : 0

  name           = "pw-${var.environment}"
  region         = var.region
  network        = data.google_compute_network.playwright[0].name
  ip_cidr_range  = "10.8.1.0/28"
  max_throughput = 300
  depends_on = [
    google_project_service.playwright_vpc_access,
    google_project_iam_member.terraform_service_account_vpcaccess_admin,
  ]
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

resource "google_cloud_run_v2_service" "gcs_proxy" {
  count = local.playwright_enabled ? 1 : 0

  name     = local.gcs_proxy_name
  location = var.region

  template {
    service_account = local.cloud_function_runtime_service_account_email

    containers {
      image = var.gcs_proxy_image

      env {
        name  = "BUCKET"
        value = local.dendrite_static_bucket_name
      }
    }

    vpc_access {
      network_interfaces {
        network    = data.google_compute_network.playwright[0].id
        subnetwork = data.google_compute_subnetwork.playwright[0].id
      }
    }
  }

  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 100
  }

  ingress = "INGRESS_TRAFFIC_INTERNAL_LOAD_BALANCER"

  depends_on = [google_project_iam_member.terraform_service_account_vpcaccess_admin]
}

resource "google_cloud_run_v2_service_iam_member" "gcs_proxy_unauth" {
  count = local.playwright_enabled ? 1 : 0

  location = var.region
  name     = google_cloud_run_v2_service.gcs_proxy[0].name
  role     = "roles/run.invoker"
  member   = local.all_users_member
}

resource "google_compute_region_network_endpoint_group" "gcs_proxy_neg" {
  count = local.playwright_enabled ? 1 : 0

  name                  = "${var.environment}-gcs-proxy-neg"
  region                = var.region
  network_endpoint_type = "SERVERLESS"

  cloud_run {
    service = google_cloud_run_v2_service.gcs_proxy[0].name
  }
}

resource "google_compute_region_backend_service" "gcs_proxy_be" {
  count = local.playwright_enabled ? 1 : 0

  name                  = "${var.environment}-gcs-proxy-be"
  region                = var.region
  load_balancing_scheme = "INTERNAL_MANAGED"
  protocol              = "HTTP"

  backend {
    group = google_compute_region_network_endpoint_group.gcs_proxy_neg[0].id
  }
}

resource "google_compute_region_url_map" "gcs_proxy_map" {
  count = local.playwright_enabled ? 1 : 0

  name            = "${var.environment}-gcs-proxy-map"
  region          = var.region
  default_service = google_compute_region_backend_service.gcs_proxy_be[0].id
}

resource "google_compute_region_target_http_proxy" "gcs_proxy_proxy" {
  count = local.playwright_enabled ? 1 : 0

  name    = "${var.environment}-gcs-proxy-proxy"
  region  = var.region
  url_map = google_compute_region_url_map.gcs_proxy_map[0].id
}

resource "google_compute_address" "gcs_proxy_ilb_ip" {
  count = local.playwright_enabled ? 1 : 0

  name         = "${var.environment}-gcs-proxy-ilb"
  region       = var.region
  address_type = "INTERNAL"
  purpose      = "GCE_ENDPOINT"
  subnetwork   = data.google_compute_subnetwork.playwright[0].id

  depends_on = [google_project_iam_member.terraform_service_account_vpcaccess_admin]
}

resource "google_compute_forwarding_rule" "gcs_proxy_ilb_fw" {
  count = local.playwright_enabled ? 1 : 0

  name                  = "${var.environment}-gcs-proxy-ilb-fw"
  region                = var.region
  load_balancing_scheme = "INTERNAL_MANAGED"
  ip_protocol           = "TCP"
  port_range            = "80"
  target                = google_compute_region_target_http_proxy.gcs_proxy_proxy[0].id
  network               = data.google_compute_network.playwright[0].id
  subnetwork            = data.google_compute_subnetwork.playwright[0].id
  ip_address            = google_compute_address.gcs_proxy_ilb_ip[0].address

  depends_on = [google_project_iam_member.terraform_service_account_vpcaccess_admin]
}

resource "google_storage_bucket" "e2e_reports" {
  count = local.manage_project_level_resources ? 1 : 0

  name                        = local.reports_bucket_name
  location                    = var.region
  uniform_bucket_level_access = true

  lifecycle {
    prevent_destroy = true
  }

  versioning {
    enabled = false
  }

  lifecycle_rule {
    action {
      type = "Delete"
    }

    condition {
      age = 7
    }
  }
}

resource "google_storage_bucket_iam_member" "reports_writer" {
  count = local.playwright_enabled ? 1 : 0

  bucket = local.reports_bucket_name
  role   = "roles/storage.objectCreator"
  member = "serviceAccount:${google_service_account.playwright[0].email}"

  depends_on = [google_storage_bucket.e2e_reports]
}

resource "google_cloud_run_v2_job" "playwright" {
  count = local.playwright_enabled ? 1 : 0

  name                = local.playwright_job_name
  location            = var.region
  deletion_protection = false

  template {
    task_count  = 1
    parallelism = 1

    template {
      service_account = google_service_account.playwright[0].email

      containers {
        image = var.playwright_image

        env {
          name  = "BASE_URL"
          value = local.gcs_proxy_uri
        }

        env {
          name  = "REPORT_BUCKET"
          value = local.reports_bucket_name
        }

        env {
          name  = "REPORT_PREFIX"
          value = local.report_prefix
        }

        env {
          name  = "PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD"
          value = "1"
        }

        env {
          name  = "PLAYWRIGHT_BROWSERS_PATH"
          value = "/ms-playwright"
        }

        env {
          name  = "NPM_CONFIG_FUND"
          value = "false"
        }

        env {
          name  = "NPM_CONFIG_AUDIT"
          value = "false"
        }

        env {
          name  = "NPM_CONFIG_PROGRESS"
          value = "false"
        }

        resources {
          limits = {
            cpu    = "2000m"
            memory = "2Gi"
          }
        }
      }

      vpc_access {
        connector = local.playwright_vpc_connector_id
        egress    = "ALL_TRAFFIC"
      }

      timeout     = "600s"
      max_retries = 0
    }
  }

  depends_on = [
    google_service_account_iam_member.tf_can_actas_playwright,
    google_project_iam_member.tf_run_admin,
    google_storage_bucket_iam_member.reports_writer,
  ]
}

output "reports_bucket" {
  value = local.playwright_enabled ? local.reports_bucket_name : null
}
