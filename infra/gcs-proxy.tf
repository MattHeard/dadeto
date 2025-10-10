locals {
  gcs_proxy_name = "${var.environment}-gcs-proxy"
}

resource "google_compute_network" "playwright" {
  count = local.playwright_enabled ? 1 : 0

  name                    = "${var.environment}-e2e-net"
  auto_create_subnetworks = false
}

resource "google_compute_subnetwork" "playwright" {
  count = local.playwright_enabled ? 1 : 0

  name          = "${var.environment}-e2e-subnet"
  ip_cidr_range = "10.10.0.0/24"
  region        = var.region
  network       = google_compute_network.playwright[0].id
}

resource "google_vpc_access_connector" "playwright" {
  count = local.playwright_enabled ? 1 : 0

  name    = "${var.environment}-svpc"
  region  = var.region
  network = google_compute_network.playwright[0].name
  subnet {
    name = google_compute_subnetwork.playwright[0].name
  }
  ip_cidr_range = "10.8.0.0/28"
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
        network    = google_compute_network.playwright[0].id
        subnetwork = google_compute_subnetwork.playwright[0].id
      }
    }
  }

  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 100
  }

  ingress = "INGRESS_TRAFFIC_INTERNAL_LOAD_BALANCER"
}

resource "google_project_iam_member" "gcs_proxy_runtime_viewer" {
  count = local.playwright_enabled ? 1 : 0

  project = var.project_id
  role    = "roles/storage.objectViewer"
  member  = local.cloud_function_runtime_service_account_member
}
