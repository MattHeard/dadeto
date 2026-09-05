# GCP test Secret Manager access

- Unexpected hurdle: the scheduled workflow failed during Terraform Apply after the schedule guard passed.
- Diagnosis: test deployments referenced shared runtime secrets, but the runtime service account IAM binding was conditional on project-level resource management.
- Fix: apply the per-secret `roles/secretmanager.secretAccessor` binding in every environment, while retaining conditional secret creation.
- Next time: inspect Terraform Apply errors for runtime identity and secret access before retrying the workflow.
