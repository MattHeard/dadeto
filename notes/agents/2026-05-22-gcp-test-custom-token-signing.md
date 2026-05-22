# gcp-test custom token signing

- Hurdle: after the Firebase config fix, `gcp-test` failed while the fixture runner created an admin custom token.
- Diagnosis: Firebase Admin fell back to IAM `signBlob` for Application Default Credentials, but the workflow identity does not have that permission.
- Fix: pass the existing service-account JSON secret only to the seed step and let the fixture runner initialize Firebase Admin with `cert(...)` when the JSON includes `client_email` and `private_key`.
- Next time: prefer local signing from the already configured CI credential over broadening project IAM for a one-off test token.
