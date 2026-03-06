# CI/CD Failure Mode Seeds

## Symptom
- Pipeline fails on test/lint/build stage after merge-ready local branch.

## Likely cause
- Environment drift (Node version, missing env vars, stale lockfile, CI-only path assumptions).

## Detection signal
- GitHub Actions job log failure with non-zero exit and stage-specific error summary.

## Prevention harness
- Keep local loop aligned with CI commands (`npm test`, `npm run lint`, required build command) before push.
- Pin/update runtime/tooling versions in repo-managed config.

## Fix path
1. Reproduce failing command locally with CI-equivalent flags/env.
2. Isolate config drift vs code regression.
3. Add/adjust tests or scripts so regression fails earlier in local loop.
4. Re-run failing CI stage and archive evidence in PR notes.
