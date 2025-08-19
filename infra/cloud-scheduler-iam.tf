# Cloud Scheduler IAM roles for Terraform

resource "google_project_iam_member" "terraform_cloudscheduler_admin" {
  project = var.project_id
  role    = "roles/cloudscheduler.admin"
  member  = "serviceAccount:terraform@${var.project_id}.iam.gserviceaccount.com"
}

