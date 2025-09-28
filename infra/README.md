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
impersonate this runtime account. The `infra/cloud-functions/get-api-key-credit` directory contains the code
for a Google Cloud Function that returns the credit associated with a given API
key. The
Cloud Functions API is enabled via a `google_project_service` resource, and the
Cloud Build API is also enabled so that functions can be built from source.
Resources for this function live in `main.tf` and all input variables are
declared in `variables.tf`.

Firestore security rules and composite indexes for the Dendrite collections are
defined in `dendrite-firestore.tf`. The rules file lives in
`rules/firestore.rules` and is released through Terraform to ensure consistent
access control across environments. Supply `database_id` (defaults to
`"(default)"`) to point rules, indexes, and Cloud Functions triggers at an
alternate Firestore database when deploying additional environments inside the
same GCP project. The generated `firebase_web_app_config` output now includes the
selected `databaseId` and the per-environment Identity Platform tenant so that
client and backend runtimes can connect to the correct datastore without manual
configuration.

Identity Platform supports multi-environment isolation via tenants. Terraform
creates one tenant per `environment`, exposes it as the
`identity_platform_tenant` output, and enables Google Sign-In within that
tenant. Customize the allowed callback domains with
`identity_platform_authorized_domains`. Project-scoped services such as API
enablement, the global Identity Platform configuration, and shared IAM bindings
are guarded by the `project_level_environment` variable. Only the environment
that matches this value (default `"prod"`) manages those singleton resources,
letting other environments create their own per-env assets without fighting over
project-level state.

## Remote State

Terraform stores its state in a Google Cloud Storage bucket. The backend is
defined in `backend.tf` and expects a bucket named `terraform-state-irien-465710` with a
`terraform/state` prefix. Ensure this bucket exists before running
`terraform init` so that the remote state can be initialized.
