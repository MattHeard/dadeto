# Infrastructure Code

This directory houses Terraform configurations and related resources for deploying cloud infrastructure.

The configuration provisions a Google Cloud Storage bucket and creates a
Firestore database. The Terraform service account is granted the
`roles/datastore.user` role so it can manage Firestore resources, and the
`roles/cloudfunctions.developer` role so it can create and manage Cloud
Functions. The `cloud-functions/get-api-key-credit` directory contains the code
for a Google Cloud Function that returns the credit associated with a given API
key. The
Cloud Functions API is enabled via a `google_project_service` resource, and the
Cloud Build API is also enabled so that functions can be built from source. The
resources for this function are defined directly in `main.tf`.

## Import Targets

The `import_targets.json` file lists any existing resources that should be
imported into the Terraform state. Each entry specifies the Terraform resource
address and the corresponding ID of the resource to import.
