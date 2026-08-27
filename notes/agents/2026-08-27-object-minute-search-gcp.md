# Object-minute search GCP test

- Unexpected hurdle: the first isolated GCP apply rejected the reserved Firestore document ID `__schema__`, treated a single-field index as redundant, and the new function failed startup through the shared browser-dependent core import path.
- Diagnosis: local Playwright passed; the GCP Terraform log and Cloud Run revision logs isolated the failures before cloud Playwright could run.
- Fix: use the non-reserved `schema` marker document ID, rely on Firestore's automatic single-field index, and initialize Firebase Admin/Firestore directly in the search function.
- Next-time guidance: run the test workflow's Terraform apply before relying on the cloud Playwright stage; the repository-wide test stack has unrelated legacy function and secret failures that can prevent that stage from running.
