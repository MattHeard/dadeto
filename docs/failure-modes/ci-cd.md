# CI/CD Failure Mode Seeds

## Symptom
- Pipeline fails on test/lint/build stage after merge-ready local branch.

## Likely cause
- Environment drift (Node version, missing env vars, stale lockfile, CI-only path assumptions).

## Node upgrade policy
- Treat Node version changes as a shared repo decision, not a single workflow tweak.
- Keep the CI/build Node version, the local developer Node version, and the deployed GCP runtime version separate in the docs so each one can move on its own schedule.
- Current Node pins live in:
  - [`.github/workflows/gcp-test.yml`](/home/matt/dadeto/.github/workflows/gcp-test.yml)
  - [`.github/workflows/gcp-prod.yml`](/home/matt/dadeto/.github/workflows/gcp-prod.yml)
  - [`.github/workflows/netlify-prod.yml`](/home/matt/dadeto/.github/workflows/netlify-prod.yml)
  - [`infra/variables.tf`](/home/matt/dadeto/infra/variables.tf)
  - [`infra/functions-v2.tf`](/home/matt/dadeto/infra/functions-v2.tf)
- Node 26 is a follow-up target for CI/build tooling, not the immediate deployed GCP runtime target.
- For the GCP path, keep Terraform and function runtime settings within the versions currently supported by Google Cloud before widening the Node bump.

## Detection signal
- GitHub Actions job log failure with non-zero exit and stage-specific error summary.

## Prevention harness
- Keep local loop aligned with CI commands (`npm test`, `npm run lint`, required build command) before push.
- Pin/update runtime/tooling versions in repo-managed config.
- When a Node bump is planned, update this note first so the intended version split is visible before workflow or infra edits land.

## Fix path
1. Reproduce failing command locally with CI-equivalent flags/env.
2. Isolate config drift vs code regression.
3. Add/adjust tests or scripts so regression fails earlier in local loop.
4. Re-run failing CI stage and archive evidence in PR notes.
