# Firebase Authentication IAM roles for Terraform

resource "google_project_iam_member" "terraform_firebase_admin" {
  project = var.project_id
  role    = "roles/firebase.admin"             # can add Firebase to a project & manage web-apps
  member  = "serviceAccount:terraform@${var.project_id}.iam.gserviceaccount.com"
}

resource "google_project_iam_member" "terraform_serviceusage_admin" {
  project = var.project_id
  role    = "roles/serviceusage.serviceUsageAdmin"  # turns APIs on/off programmatically
  member  = "serviceAccount:terraform@${var.project_id}.iam.gserviceaccount.com"
}

