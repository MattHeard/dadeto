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
  project            = var.project_id
  service            = "compute.googleapis.com"
  disable_on_destroy = false
}

resource "google_compute_backend_bucket" "dendrite_static" {
  name        = "${var.environment}-dendrite-static"
  bucket_name = google_storage_bucket.dendrite_static.name
  enable_cdn  = true

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
  name            = "${var.environment}-dendrite-url-map"
  default_service = google_compute_backend_bucket.dendrite_static.id

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
