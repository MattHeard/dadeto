# Infrastructure Code

This directory houses Terraform configurations and related resources for deploying cloud infrastructure.

The configuration provisions two Google Cloud Storage buckets, one for static
files and another for Cloud Functions source archives, and creates a
Firestore database. The Terraform service account is granted the
`roles/datastore.user` role so it can manage Firestore resources, the
`roles/cloudfunctions.developer` role so it can create and manage Cloud
Functions, and the `roles/cloudfunctions.admin` role so it can set Cloud
Functions IAM policy. A separate compute service account is created for running
Cloud Functions, and the Terraform service account is allowed to
impersonate this runtime account. The `cloud-functions/get-api-key-credit` directory contains the code
for a Google Cloud Function that returns the credit associated with a given API
key. The
Cloud Functions API is enabled via a `google_project_service` resource, and the
Cloud Build API is also enabled so that functions can be built from source. The
resources for this function are defined directly in `main.tf`.

Firestore security rules and composite indexes for the Dendrite collections are
defined in `dendrite-firestore.tf`. The rules file lives in `rules/firestore.rules`
and is released through Terraform to ensure consistent access control across
environments.

## Import Targets

The `import_targets.json` file lists any existing resources that should be
imported into the Terraform state. Each entry specifies the Terraform resource
address and either an `id` string or a `parts` object. The `parts` variant is
used for resources that require multiple ID components, providing `resource`,
`role`, and `member` values separately.
