output "firebase_web_app_config" {
  value = local.firebase_web_app_config
}

output "identity_platform_tenant" {
  value = {
    name       = google_identity_platform_tenant.environment.name
    id         = google_identity_platform_tenant.environment.id
    project_id = var.project_id
  }
}

output "effective_environment" {
  description = "Deployment environment that Terraform evaluated"
  value       = var.environment
}

output "effective_project_level_environment" {
  description = "Project-level environment value seen during plan"
  value       = var.project_level_environment
}

output "manage_project_level_resources" {
  description = "Whether project-level resources will be managed"
  value       = local.manage_project_level_resources
}

output "manage_firestore_services" {
  description = "Whether Firestore services are managed in this run"
  value       = local.manage_firestore_services
}

output "playwright_job_name" {
  description = "Name of the Playwright Cloud Run job"
  value       = local.playwright_enabled ? google_cloud_run_v2_job.playwright[0].name : null
}

output "playwright_region" {
  description = "Region for the Playwright Cloud Run job"
  value       = local.playwright_enabled ? var.region : null
}

output "lb_ip" {
  description = "Global LB IPv4"
  value       = local.enable_lb ? google_compute_global_address.dendrite[0].address : null
}
