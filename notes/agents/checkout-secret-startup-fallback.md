# Checkout secret startup fallback

- Unexpected hurdle: the production deploy failed because a newly created Secret Manager secret had no version `1`.
- Diagnosis: Terraform created the secret metadata and IAM accessor binding, then Cloud Run rejected the function revision while resolving the missing secret version.
- Fix: the checkout wrapper now logs a warning and passes an explicit readiness flag; the core handler returns HTTP 503 until Stripe is configured.
- Next-time guidance: populate the Stripe secret version before expecting checkout requests to succeed; the function can now deploy safely while that is pending.
