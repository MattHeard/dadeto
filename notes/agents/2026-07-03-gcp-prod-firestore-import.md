Unexpected hurdle: gcp-prod failed because Terraform tried to create a Firestore database that already existed in GCP.

Diagnosis path: the GitHub Actions log showed `google_firestore_database.database[0]` failing with HTTP 409, and the workflow already had the restored database id wired into `TF_VAR_database_id`.

Chosen fix: add a pre-plan workflow step that checks whether the target database exists and imports `google_firestore_database.database[0]` into Terraform state before `terraform plan`.

Next-time guidance: when restoring a named Firestore database outside Terraform, adopt it into state first so prod deploys do not try to recreate it.
