locals {
  production_alerting_enabled = var.environment == "prod" && trimspace(var.production_alert_email) != ""
}

resource "google_project_service" "monitoring" {
  count              = local.manage_project_level_resources && local.production_alerting_enabled ? 1 : 0
  project            = var.project_id
  service            = "monitoring.googleapis.com"
  disable_on_destroy = false

  lifecycle {
    prevent_destroy = true
  }
}

resource "google_monitoring_notification_channel" "production_email" {
  count        = local.production_alerting_enabled ? 1 : 0
  project      = var.project_id
  display_name = "Production error email"
  type         = "email"

  labels = {
    email_address = trimspace(var.production_alert_email)
  }

  depends_on = [
    google_project_service.monitoring,
  ]
}

resource "google_monitoring_alert_policy" "production_errors" {
  count        = local.production_alerting_enabled ? 1 : 0
  project      = var.project_id
  display_name = "Production Cloud Function errors"
  combiner     = "OR"
  enabled      = true

  conditions {
    display_name = "Prod error logs"

    condition_matched_log {
      filter = <<-EOT
(
  resource.type="cloud_function" OR
  resource.type="cloud_run_revision"
)
(
  resource.labels.function_name=~"^prod-" OR
  resource.labels.service_name=~"^prod-"
)
severity>=ERROR
EOT
    }
  }

  alert_strategy {
    notification_rate_limit {
      period = "300s"
    }
  }

  notification_channels = [
    google_monitoring_notification_channel.production_email[0].name,
  ]

  depends_on = [
    google_project_service.monitoring,
  ]
}
