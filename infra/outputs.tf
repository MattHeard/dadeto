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
