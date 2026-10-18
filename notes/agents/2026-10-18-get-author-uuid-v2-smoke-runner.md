# get-author-uuid-v2 smoke runner

- Unexpected hurdle: the deployment and scoped apply path are ready, but the production apply is still waiting for explicit authorization, so live CORS and authentication evidence cannot be gathered in this environment.
- Diagnosis: the endpoint's remaining acceptance needs one OPTIONS preflight, two authenticated GETs proving UUID stability, and missing/invalid-token 401 responses. A valid GET may create the caller's author UUID document.
- Chosen fix: add a mocked-testable Node smoke runner that performs no requests without `--execute`, requires an allowlisted production origin and HTTPS Cloud Functions/Run endpoint, reads the Firebase token only from its environment variable, and prints status evidence without the token or UUID.
- Next-time guidance: only run it after the exact Rank 1 apply is authorized and complete. Capture its redacted output with the apply run; the offline handler tests continue to prove unauthorized requests do not access Firestore.
