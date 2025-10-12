# Global HTTPS Load Balancer configuration
# Terminates TLS with Google-managed certificate and caches via Cloud CDN

variable "lb_cert_domains" {
  description = "Domain names for the TLS certificate"
  type        = list(string)
  default = [
    "dendritestories.co.nz",
    "www.dendritestories.co.nz",
  ]
}

resource "google_project_service" "compute" {
  count              = local.enable_lb || local.playwright_enabled ? 1 : 0
  project            = var.project_id
  service            = "compute.googleapis.com"
  disable_on_destroy = false
}

locals {
  lb_resource_prefix = "${var.environment}-dendrite"
}

resource "google_compute_backend_bucket" "dendrite_static" {
  provider = google-beta
  count    = local.enable_lb ? 1 : 0

  name        = "${local.lb_resource_prefix}-static"
  bucket_name = local.dendrite_static_bucket_name
  enable_cdn  = true

  # Set COOP header to isolate browsing context group
  custom_response_headers = [
    "Cross-Origin-Opener-Policy: restrict-properties",
  ]

  depends_on = [google_project_service.compute]
}

resource "google_compute_managed_ssl_certificate" "dendrite" {
  count = local.enable_lb && local.is_prod ? 1 : 0

  name = "${local.lb_resource_prefix}-cert"

  managed {
    domains = var.lb_cert_domains
  }

  depends_on = [google_project_service.compute]
}

resource "google_compute_url_map" "dendrite" {
  provider = google-beta
  count    = local.enable_lb && local.is_prod ? 1 : 0
  name     = "${local.lb_resource_prefix}-url-map"

  # mandatory fallback for any request that dodges all matchers
  default_service = google_compute_backend_bucket.dendrite_static[count.index].id

  # --- 1️⃣  Apex host goes through its own matcher -------------
  host_rule {
    hosts        = ["dendritestories.co.nz"]
    path_matcher = "apex-redirect"
  }

  path_matcher {
    name = "apex-redirect"

    # url_redirect runs even though a default_service is required syntactically
    default_service = google_compute_backend_bucket.dendrite_static[count.index].id

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
    default_service = google_compute_backend_bucket.dendrite_static[count.index].id

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

      service = google_compute_backend_bucket.dendrite_static[count.index].id
    }
  }

  depends_on = [google_project_service.compute]
}

resource "google_compute_url_map" "http_service" {
  count = local.enable_lb && !local.is_prod ? 1 : 0

  name            = "${local.lb_resource_prefix}-http-map"
  default_service = google_compute_backend_bucket.dendrite_static[0].id

  depends_on = [google_project_service.compute]
}

resource "google_compute_target_https_proxy" "dendrite" {
  count = local.enable_lb && local.is_prod ? 1 : 0

  name             = "${local.lb_resource_prefix}-https-proxy"
  url_map          = google_compute_url_map.dendrite[count.index].id
  ssl_certificates = [google_compute_managed_ssl_certificate.dendrite[count.index].id]

  depends_on = [google_project_service.compute]
}

resource "google_compute_global_address" "dendrite" {
  count = local.enable_lb ? 1 : 0

  name = "${local.lb_resource_prefix}-ip"

  depends_on = [google_project_service.compute]
}

resource "google_compute_global_forwarding_rule" "dendrite_https" {
  count = local.enable_lb && local.is_prod ? 1 : 0

  name       = "${local.lb_resource_prefix}-https-fr"
  target     = google_compute_target_https_proxy.dendrite[count.index].id
  port_range = "443"
  ip_address = google_compute_global_address.dendrite[count.index].address

  depends_on = [google_project_service.compute]
}

resource "google_compute_url_map" "redirect" {
  count = local.enable_lb && local.is_prod ? 1 : 0

  name = "${var.environment}-dendrite-redirect"
  default_url_redirect {
    https_redirect = true
    strip_query    = false
  }

  depends_on = [google_project_service.compute]
}

resource "google_compute_target_http_proxy" "http" {
  count = local.enable_lb && !local.is_prod ? 1 : 0

  name    = "${local.lb_resource_prefix}-http-proxy"
  url_map = google_compute_url_map.http_service[0].id

  depends_on = [google_project_service.compute]
}

resource "google_compute_target_http_proxy" "redirect" {
  count = local.enable_lb && local.is_prod ? 1 : 0

  name    = "${var.environment}-dendrite-http-proxy"
  url_map = google_compute_url_map.redirect[count.index].id

  depends_on = [google_project_service.compute]
}

resource "google_compute_global_forwarding_rule" "dendrite_http" {
  count = local.enable_lb && !local.is_prod ? 1 : 0

  name       = "${var.environment}-dendrite-http-fr"
  target     = google_compute_target_http_proxy.http[0].id
  port_range = "80"
  ip_address = google_compute_global_address.dendrite[0].address

  depends_on = [google_project_service.compute]
}

resource "google_compute_global_forwarding_rule" "dendrite_http_redirect" {
  count = local.enable_lb && local.is_prod ? 1 : 0

  name       = "${var.environment}-dendrite-http-fr"
  target     = google_compute_target_http_proxy.redirect[0].id
  port_range = "80"
  ip_address = google_compute_global_address.dendrite[0].address

  depends_on = [google_project_service.compute]
}
