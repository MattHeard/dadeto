variable "project_id" {
  type = string
}

variable "environment" {
  type = string
}

variable "static_bucket_name" {
  type = string
}

variable "runtime_service_account_email" {
  type = string
}

variable "lb_cert_domains" {
  type = list(string)
  default = [
    "dendritestories.co.nz",
    "www.dendritestories.co.nz",
  ]
}

data "google_project" "project" {
  project_id = var.project_id
}

resource "google_project_service" "compute" {
  project            = var.project_id
  service            = "compute.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_iam_member" "build_loadbalancer_admin" {
  project = var.project_id
  role    = "roles/compute.loadBalancerAdmin"
  member  = "serviceAccount:${data.google_project.project.number}@cloudbuild.gserviceaccount.com"
}

resource "google_project_iam_member" "terraform_loadbalancer_admin" {
  project = var.project_id
  role    = "roles/compute.loadBalancerAdmin"
  member  = "serviceAccount:terraform@${var.project_id}.iam.gserviceaccount.com"
}

resource "google_project_iam_member" "runtime_loadbalancer_admin" {
  project = var.project_id
  role    = "roles/compute.loadBalancerAdmin"
  member  = "serviceAccount:${var.runtime_service_account_email}"
}

resource "google_project_iam_member" "terraform_security_admin" {
  project = var.project_id
  role    = "roles/compute.securityAdmin"
  member  = "serviceAccount:terraform@${var.project_id}.iam.gserviceaccount.com"
}

resource "google_compute_backend_bucket" "dendrite_static" {
  name        = "${var.environment}-dendrite-static"
  bucket_name = var.static_bucket_name
  enable_cdn  = true

  custom_response_headers = [
    "Cross-Origin-Opener-Policy: restrict-properties",
  ]

  depends_on = [
    google_project_service.compute,
    google_project_iam_member.terraform_loadbalancer_admin,
    google_project_iam_member.terraform_security_admin,
  ]
}

resource "google_compute_managed_ssl_certificate" "dendrite" {
  name = "${var.environment}-dendrite-cert"

  managed {
    domains = var.lb_cert_domains
  }

  depends_on = [
    google_project_service.compute,
    google_project_iam_member.terraform_security_admin,
  ]
}

resource "google_compute_url_map" "dendrite" {
  provider = google-beta
  name     = "${var.environment}-dendrite-url-map"

  default_service = google_compute_backend_bucket.dendrite_static.id

  host_rule {
    hosts        = ["dendritestories.co.nz"]
    path_matcher = "apex-redirect"
  }

  path_matcher {
    name = "apex-redirect"

    default_service = google_compute_backend_bucket.dendrite_static.id

    route_rules {
      priority = 2

      match_rules {
        prefix_match = "/"
      }

      url_redirect {
        host_redirect  = "www.dendritestories.co.nz"
        https_redirect = true
        strip_query    = false
      }
    }
  }

  host_rule {
    hosts        = ["*"]
    path_matcher = "allpaths"
  }

  path_matcher {
    name            = "allpaths"
    default_service = google_compute_backend_bucket.dendrite_static.id

    route_rules {
      priority = 1

      match_rules {
        full_path_match = "/"
      }

      route_action {
        url_rewrite {
          path_prefix_rewrite = "/index.html"
        }
      }

      service = google_compute_backend_bucket.dendrite_static.id
    }
  }

  depends_on = [
    google_project_service.compute,
    google_project_iam_member.terraform_loadbalancer_admin,
  ]
}

resource "google_compute_target_https_proxy" "dendrite" {
  name             = "${var.environment}-dendrite-https-proxy"
  url_map          = google_compute_url_map.dendrite.id
  ssl_certificates = [google_compute_managed_ssl_certificate.dendrite.id]

  depends_on = [
    google_project_service.compute,
    google_project_iam_member.terraform_loadbalancer_admin,
    google_project_iam_member.terraform_security_admin,
  ]
}

resource "google_compute_global_address" "dendrite" {
  name = "${var.environment}-dendrite-ip"

  depends_on = [
    google_project_service.compute,
    google_project_iam_member.terraform_loadbalancer_admin,
  ]
}

resource "google_compute_global_forwarding_rule" "dendrite_https" {
  name       = "${var.environment}-dendrite-https-fr"
  target     = google_compute_target_https_proxy.dendrite.id
  port_range = "443"
  ip_address = google_compute_global_address.dendrite.address

  depends_on = [
    google_project_service.compute,
    google_project_iam_member.terraform_loadbalancer_admin,
    google_project_iam_member.terraform_security_admin,
  ]
}

resource "google_compute_url_map" "redirect" {
  name = "${var.environment}-dendrite-redirect"
  default_url_redirect {
    https_redirect = true
    strip_query    = false
  }

  depends_on = [
    google_project_service.compute,
    google_project_iam_member.terraform_loadbalancer_admin,
  ]
}

resource "google_compute_target_http_proxy" "redirect" {
  name    = "${var.environment}-dendrite-http-proxy"
  url_map = google_compute_url_map.redirect.id

  depends_on = [
    google_project_service.compute,
    google_project_iam_member.terraform_loadbalancer_admin,
  ]
}

resource "google_compute_global_forwarding_rule" "dendrite_http" {
  name       = "${var.environment}-dendrite-http-fr"
  target     = google_compute_target_http_proxy.redirect.id
  port_range = "80"
  ip_address = google_compute_global_address.dendrite.address

  depends_on = [
    google_project_service.compute,
    google_project_iam_member.terraform_loadbalancer_admin,
  ]
}

output "ip_address" {
  value = google_compute_global_address.dendrite.address
}
