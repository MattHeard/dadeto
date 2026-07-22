locals {
  codex_vm_enabled = var.codex_vm_enabled && var.environment == "prod" && var.codex_admin_member != ""
  codex_vm_tag     = "codex-vm"
}

resource "google_project_service" "iap" {
  count = local.codex_vm_enabled ? 1 : 0

  project            = var.project_id
  service            = "iap.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "oslogin" {
  count = local.codex_vm_enabled ? 1 : 0

  project            = var.project_id
  service            = "oslogin.googleapis.com"
  disable_on_destroy = false
}

resource "google_compute_network" "codex" {
  count = local.codex_vm_enabled ? 1 : 0

  name                    = "codex"
  auto_create_subnetworks = false

  depends_on = [google_project_service.compute]
}

resource "google_compute_subnetwork" "codex" {
  count = local.codex_vm_enabled ? 1 : 0

  name          = "codex"
  region        = var.region
  network       = google_compute_network.codex[0].id
  ip_cidr_range = "10.20.0.0/28"
}

resource "google_compute_firewall" "codex_iap_ssh" {
  count = local.codex_vm_enabled ? 1 : 0

  name          = "codex-iap-ssh"
  network       = google_compute_network.codex[0].name
  direction     = "INGRESS"
  source_ranges = ["35.235.240.0/20"]
  target_tags   = [local.codex_vm_tag]

  allow {
    protocol = "tcp"
    ports    = ["22"]
  }
}

resource "google_service_account" "codex_vm" {
  count = local.codex_vm_enabled ? 1 : 0

  account_id   = "codex-vm"
  display_name = "Codex VM"
  description  = "Identity for the production Codex administration VM; intentionally has no project-level roles"
}

resource "google_service_account_iam_member" "terraform_can_use_codex_vm" {
  count = local.codex_vm_enabled ? 1 : 0

  service_account_id = google_service_account.codex_vm[0].name
  role               = "roles/iam.serviceAccountUser"
  member             = local.terraform_service_account_member
}

resource "google_service_account_iam_member" "administrator_can_use_codex_vm" {
  count = local.codex_vm_enabled ? 1 : 0

  service_account_id = google_service_account.codex_vm[0].name
  role               = "roles/iam.serviceAccountUser"
  member             = var.codex_admin_member
}

locals {
  codex_administrator_roles = toset([
    "roles/compute.instanceAdmin.v1",
    "roles/compute.osAdminLogin",
    "roles/iap.tunnelResourceAccessor",
  ])
}

resource "google_project_iam_member" "codex_administrator" {
  for_each = local.codex_vm_enabled ? local.codex_administrator_roles : toset([])

  project = var.project_id
  role    = each.value
  member  = var.codex_admin_member
}

resource "google_compute_instance" "codex_vm" {
  count = local.codex_vm_enabled ? 1 : 0

  name         = "codex-vm"
  zone         = var.codex_vm_zone
  machine_type = var.codex_vm_machine_type
  tags         = [local.codex_vm_tag]

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-12"
      size  = var.codex_vm_disk_size_gb
      type  = "pd-balanced"
    }
  }

  network_interface {
    subnetwork = google_compute_subnetwork.codex[0].id

    # The address is outbound-only and deliberately omitted from Terraform outputs.
    access_config {}
  }

  metadata = {
    enable-oslogin         = "TRUE"
    block-project-ssh-keys = "TRUE"
  }

  service_account {
    email  = google_service_account.codex_vm[0].email
    scopes = ["cloud-platform"]
  }

  shielded_instance_config {
    enable_secure_boot          = true
    enable_vtpm                 = true
    enable_integrity_monitoring = true
  }

  depends_on = [
    google_project_service.iap,
    google_project_service.oslogin,
    google_service_account_iam_member.terraform_can_use_codex_vm,
    google_service_account_iam_member.administrator_can_use_codex_vm,
  ]
}
