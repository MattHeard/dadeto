output "firebase_web_app_config" {
  value = local.firebase_web_app_config
}

output "identity_platform_tenant" {
  value = {
    name       = google_identity_platform_tenant.environment.name
    tenant_id  = google_identity_platform_tenant.environment.tenant_id
    project_id = var.project_id
  }
}
