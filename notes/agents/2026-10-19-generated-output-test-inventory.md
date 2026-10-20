# Generated-output test inventory — 2026-10-19

## Loop contract and result

- Hypothesis: test references to generated paths include at least one remaining dependency on generated output that runs implicitly in a clean-checkout unit suite.
- Scope: classify remaining tests that mention or read `public/`, `infra/browser`, `infra/cloud-functions`, `infra/build`, and `src/build/blog.json`; do not change production packaging in this inventory loop.
- Acceptance: record source-backed classifications and a bounded follow-up for any uncovered clean-checkout gap; run `npm run check` and `git diff --check` before closing Bead `dadeto-u7vf`.

## Findings

- Source/unit tests: `test/core/copy.test.js`, `test/core/scripts/generate/writeFormattedHtml.test.js`, and `test/core/build/manuals.test.js` pass path strings or injected filesystem adapters. They do not read generated checkout output.
- Simulator/integration: `test/local/gcp-simulator.test.js` configures the optional `public/` directory, but its assertions cover simulated routes and fake storage. The previous focused run with `public/` absent passed 4 suites / 61 tests; this is not evidence that generated static assets are correct.
- E2E runtime: `test/mosslight-e2e/server.mjs` serves files from `public/`. The `npm run test:e2e` entrypoint runs `npm run build` before the Playwright runner; the unit test phase runs before that build and does not import this server. The E2E runtime dependency is explicit in its owning command.
- Canonical source data: `test/core/browser/game/neonCovenant.test.js` reads tracked `src/build/blog.json`, which is author-maintained input used by the site generator, not an output directory produced by a prior test. Its classification is source data.
- Copy behavior: `test/core/build/dendrite.test.js` exercises the copier with injected filesystem operations. `test/core/build/copy-cloud.test.js` has a temporary project fixture that asserts real output bytes and missing-source failure for `admin-core.js`, `load-static-config-core.js`, and `logging.js`.
- Remaining gap: `test/infra/googleAuthEntrypoints.test.js` reads the three root `infra/` Google-auth object files as well as source and Terraform. `src/core/build/copy-cloud.js` copies those root files from `src/browser/`; Terraform uploads them. The source-contract suite runs in `npm run check` before any build, while the current temporary output fixture covers only the three other root wrappers above. Thus those three assertions rely on checked-in generated copies being present and can be masked by a non-clean local build. This is the only uncovered direct generated-output dependency found in this slice.

## Follow-up

Create a separate bounded test slice that removes the generated `infra/{contentsGoogleAuthModule,statsGoogleAuthModule,variantGoogleSignIn}.js` reads from the source-contract suite, verifies all three outputs and exact bytes in a temporary `createCopyCloudHandle` fixture, and extends the clean-checkout regression so source contracts pass with these generated copies absent. Preserve the Terraform source-contract assertions. No production package logic needs to change.

## Follow-up implementation — 2026-10-19

`test/infra/googleAuthEntrypoints.test.js` now checks browser source and Terraform configuration without reading generated root `infra/` copies. `test/core/build/copy-cloud.test.js` runs the real copy workflow in a temporary project containing the three Google-auth source files, asserts exact output bytes for all three Terraform objects, and fails when a source module is missing. The clean-checkout child suite now runs both relevant source-contract suites with all six generated root wrappers/auth objects absent, then injects a generated Google-auth read and verifies that the child suite fails.

Focused command `npm run test:impact -- --files test/infra/googleAuthEntrypoints.test.js test/core/build/copy-cloud.test.js` passed (2 suites, 10 tests). `npm run check` passed all 10 gates: five impact shards passed 955 suites / 6,528 tests, duplication reported 0 clones, and npm audit found 0 vulnerabilities. This local check does not measure global coverage. `git diff --check` passed. The authoritative Full Check on the updated PR commit is pending.

## Search and limits

Searched tracked test/workflow files for `public/`, `infra/browser`, `infra/cloud-functions`, `infra/build`, `src/build/blog.json`, and filesystem reads/copy operations. Classification follows actual file access and the owning runner command rather than path strings alone. This inventory does not claim generated static asset correctness or production deployment validation.

## Evaluation

- `npm run check` — passed all 10 gates. The five impact shards passed 955 suites and 6,526 tests; duplication reported 0 clones and npm audit found 0 vulnerabilities. This fast local check does not measure global coverage.
- `git diff --check` — passed.
