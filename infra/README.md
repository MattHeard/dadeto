# Infrastructure Code

This directory houses Terraform configurations and related resources for deploying cloud infrastructure.

The configuration provisions a Google Cloud Storage bucket and now also creates
a Firestore database. The Terraform service account is granted the
`roles/datastore.user` role so it can manage Firestore resources. Additionally,
the `cloud-functions/get-api-key-credit` directory contains the code for a
Google Cloud Function that returns the credit associated with a given API key.
The resources for this function are defined directly in `main.tf`.

## Import Targets

The `import_targets.json` file lists any existing resources that should be
imported into the Terraform state. Each entry specifies the Terraform resource
address and the corresponding ID of the resource to import.
