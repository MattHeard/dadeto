# Global HTTPS Load Balancer configuration
# Terminates TLS with Google-managed certificate and caches via Cloud CDN

variable "lb_cert_domains" {
  description = "Domain names for the TLS certificate"
  type        = list(string)
  default     = [
    "dendritestories.co.nz",
    "www.dendritestories.co.nz",
  ]
}

resource "google_project_service" "compute" {
  count             = local.manage_project_level_resources ? 1 : 0
  project           = var.project_id
  service           = "compute.googleapis.com"
  disable_on_destroy = false
}

resource "google_compute_backend_bucket" "dendrite_static" {
  name        = "${var.environment}-dendrite-static"
  bucket_name = google_storage_bucket.dendrite_static.name
  enable_cdn  = true

  # Set COOP header to isolate browsing context group
  custom_response_headers = [
    "Cross-Origin-Opener-Policy: restrict-properties",
  ]

  depends_on = concat(
    local.compute_service_dependency,
    local.loadbalancer_admin_dependency,
    local.security_admin_dependency,
  )
}

resource "google_compute_managed_ssl_certificate" "dendrite" {
  name = "${var.environment}-dendrite-cert"

  managed {
    domains = var.lb_cert_domains
  }

  depends_on = concat(
    local.compute_service_dependency,
    local.security_admin_dependency,
  )
}

resource "google_compute_url_map" "dendrite" {
  provider = google-beta
  name     = "${var.environment}-dendrite-url-map"

  # mandatory fallback for any request that dodges all matchers
  default_service = google_compute_backend_bucket.dendrite_static.id

  # --- 1️⃣  Apex host goes through its own matcher -------------
  host_rule {
    hosts        = ["dendritestories.co.nz"]
    path_matcher = "apex-redirect"
  }

  path_matcher {
    name = "apex-redirect"

    # url_redirect runs even though a default_service is required syntactically
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

  # --- 2️⃣  Existing wildcard matcher for www & any future subs ----
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

  depends_on = concat(
    local.compute_service_dependency,
    local.loadbalancer_admin_dependency,
  )
}

resource "google_compute_target_https_proxy" "dendrite" {
  name             = "${var.environment}-dendrite-https-proxy"
  url_map          = google_compute_url_map.dendrite.id
  ssl_certificates = [google_compute_managed_ssl_certificate.dendrite.id]

  depends_on = concat(
    local.compute_service_dependency,
    local.loadbalancer_admin_dependency,
    local.security_admin_dependency,
  )
}

resource "google_compute_global_address" "dendrite" {
  name = "${var.environment}-dendrite-ip"

  depends_on = concat(
    local.compute_service_dependency,
    local.loadbalancer_admin_dependency,
  )
}

resource "google_compute_global_forwarding_rule" "dendrite_https" {
  name       = "${var.environment}-dendrite-https-fr"
  target     = google_compute_target_https_proxy.dendrite.id
  port_range = "443"
  ip_address = google_compute_global_address.dendrite.address

  depends_on = concat(
    local.compute_service_dependency,
    local.loadbalancer_admin_dependency,
    local.security_admin_dependency,
  )
}

resource "google_compute_url_map" "redirect" {
  name = "${var.environment}-dendrite-redirect"
  default_url_redirect {
    https_redirect = true
    strip_query    = false
  }

  depends_on = concat(
    local.compute_service_dependency,
    local.loadbalancer_admin_dependency,
  )
}

resource "google_compute_target_http_proxy" "redirect" {
  name    = "${var.environment}-dendrite-http-proxy"
  url_map = google_compute_url_map.redirect.id

  depends_on = concat(
    local.compute_service_dependency,
    local.loadbalancer_admin_dependency,
  )
}

resource "google_compute_global_forwarding_rule" "dendrite_http" {
  name       = "${var.environment}-dendrite-http-fr"
  target     = google_compute_target_http_proxy.redirect.id
  port_range = "80"
  ip_address = google_compute_global_address.dendrite.address

  depends_on = concat(
    local.compute_service_dependency,
    local.loadbalancer_admin_dependency,
  )
}
