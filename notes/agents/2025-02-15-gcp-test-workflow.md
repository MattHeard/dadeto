# GCP Test Workflow Trigger Adjustment

- **Surprise:** The gcp-test workflow was still configured to run on every push to `main`, which risks spinning up costly ephemeral environments even for changes unrelated to infra. I expected it to already be manual-only based on previous conversations in the notes.
- **What I learned:** Quick audits of automation triggers can prevent unnecessary infrastructure churn. Keeping workflow triggers narrowly scoped reduces accidental spend and avoids unexpected terraform locks.
- **Next time:** Before touching Terraform-backed workflows, double-check concurrency and destroy ordering; queuing is already set up here, so future edits should preserve that behavior.
