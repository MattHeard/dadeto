# Cloud Function package closure evidence

Date: 2026-10-20 UTC. Bead: `dadeto-0tvi`, under the Rank 2 Agent Hardening spec.

## Finding and decision

Terraform's `archive_file` blocks use the generated directories under `infra/cloud-functions/<function>` as their `source_dir`. The existing `test/core/copyCloud.test.js` checks the build copy contract, but it did not detect an omitted module from an already-generated function package. A closure check over the built package directories is more useful here than another source-only assertion.

Added `npm run verify:cloud-packages`. It reads the Terraform archive directories, then parses reachable imports from each generated `index.js` and checks that local imports resolve inside that archive tree and external packages are declared in its runtime manifest. The parser is injected from `src/local` so `src/core` does not acquire an Acorn dependency. The Terraform validation workflow runs the check immediately after `npm run build:cloud`, and its path filters include core changes and changes to the verifier/workflow itself.

The runtime manifest now declares `@google-cloud/storage` directly. Source code imports it directly; it previously appeared only as an optional transitive dependency through `firebase-admin`.

## Measurements and reproduced miss

- `npm run build:cloud`: 7.30 seconds real time.
- `npm run verify:cloud-packages`: 0.73 seconds real time; 26 Terraform packages, 657 reachable modules, 1,155 imports, no issues.
- Controlled omission: removed `infra/cloud-functions/render-contents/core/google-auth-status-asset-version.js`. The existing source-only test still passed (1 suite / 2 tests), while `npm run verify:cloud-packages` failed on `render-contents/core/cloud/render-contents/render-contents-core.js` importing the missing module. Restored the generated file and reran the verifier successfully.
- Focused regressions also cover missing `google-auth-status-asset-version.js` and `submit-shared.js`, missing imports, package escapes, directory imports, undeclared external packages, and malformed package inputs.

The combined build and scan cost is about eight seconds when run locally. The check is placed in Terraform validation CI for now because it must run against a freshly generated package tree; the workflow runs it only for infrastructure, cloud source, core, dependency, verifier, or workflow changes. The normal fast check remains unchanged.

## Validation

- Focused `npm run test:impact -- --files test/core/local/cloudFunctionPackageClosure.test.js test/local/verifyCloudFunctionPackages.test.js test/infra/terraformValidateWorkflow.test.js`: 3 suites / 12 tests passed.
- `npm run verify:cloud-packages`: passed on all 26 package directories.
- `npm run non-core-thin`, `npm run depcruise`, `npm run duplication`, and `npm run tsdoc:check`: passed; dependency cruiser found no boundary violations and jscpd found zero clones.
- Final fast `npm run check`: all 10 gates passed; five serial impact shards passed 970 suites / 6,774 tests. This is local fast-check evidence, not full coverage evidence.

The local Terraform wrapper permits formatting only and blocks `terraform init`. The matching remote Terraform Validate run 39404553560 succeeded, including package build, generated dependency-closure verification, init, format, and validate. The matching Full Check run 39404553544 initially failed at 99.942% branch coverage with nine uncovered arms in the new verifier; the other gates passed.

## Coverage follow-up

The Full Check report exposed uncovered verifier edge cases that the fast check does not measure. Added tests for missing runtime dependency sections, default command options, null diagnostic specifiers, and invalid parser nodes; removed two defensive branches that cannot occur (`Array.pop()` while the queue is nonempty, and a fallback after splitting any string). The pop result is annotated with the queue invariant for the JSDoc type checker.

The first follow-up Full Check, 39406010781, cleared branch coverage but failed the function threshold at 99.988%. Its report artifact 12257272582 identified the only uncovered function as the default no-op writer at line 44. Added a regression that calls `main` without a writer against an empty Terraform fixture. The focused suites pass (2 suites / 16 tests), and the latest local `npm run check` passes all 10 gates. A fresh exact-head Full Check must confirm all coverage metrics before closing `dadeto-0tvi`; record its result in the Bead and Rank 2 spec.

## Hurdle and next-time guidance

The first checker draft treated each source tree as a conventional directory and imported Acorn directly from `src/core`. The generated package layout showed that Terraform archives nested copies of shared modules, and repository gates rejected the dependency crossing. Inspect the actual Terraform `source_dir` values, keep parser libraries in `src/local`, inject their parser function into core, and run `npm run build:cloud` to completion before scanning package trees. Starting the scan while the build was still copying files produced transient false errors.
