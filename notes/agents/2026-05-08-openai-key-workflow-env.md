# 2026-05-08 OpenAI key workflow env

- Unexpected hurdle: `bd` is unavailable in this container, so the required issue comment evidence could not be recorded through beads.
- Diagnosis path: inspected both GCP workflows and confirmed they passed OAuth/Firebase Terraform variables but not `TF_VAR_openai_api_key`, despite Terraform already defining the sensitive `openai_api_key` variable consumed by the Realtime Cloud Function.
- Chosen fix: wired the user-provided `OPENAI_API_KEY` repository secret into both test and prod workflows as `TF_VAR_openai_api_key` so Terraform can pass it to the `OPENAI_API_KEY` Cloud Function environment variable.
- Next-time guidance: when adding Terraform variables backed by secrets, update every deploy workflow in the same loop and add a cheap textual check for the expected workflow env mapping.

## Evidence

- `bd prime` failed with `bd: command not found`; evidence retained here instead.
- `python3 - <<'PY' ...` confirmed both `.github/workflows/gcp-test.yml` and `.github/workflows/gcp-prod.yml` contain `TF_VAR_openai_api_key: ${{ secrets.OPENAI_API_KEY }}`.
