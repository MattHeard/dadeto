# November tooling dependency audit

Bead: `dadeto-2gx2`, discovered during the Rank 11 generator typing prerequisite
`dadeto-xyth`. The unchanged lockfile at `e984e63f1b` now reports 22 findings
(21 moderate and one high). These are current advisory results, not evidence
that the generator typing change introduced vulnerable dependencies.

Upstream patched releases:

- [glob 14.0.2](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4)
  stops aborted traversal from continuing in the background.
- [minimatch 11.0.1](https://github.com/advisories/GHSA-g3hv-75wg-m249)
  addresses globparts preprocessing amplification.
- [re2js 2.8.7](https://github.com/advisories/GHSA-gg6h-894w-4m9c)
  addresses repeated lookbehind matching cost.

The fix overrides only affected modern glob/minimatch ranges, plus the re2js
patch release. The nested ESLint matcher override specifies its version while
retaining the prior brace-expansion pin. Legacy test-exclude still resolves the
callable glob 7/minimatch 3 APIs; replacing those indiscriminately would break
coverage tooling. No Jest, ESLint, Stryker or madge downgrade, advisory exception,
gate exclusion or threshold change is involved. Live registry engine metadata
supports this repository's Node 24 runtime.

## Evidence

- `npm install`: 894 packages installed, zero vulnerabilities.
- `npm audit --json`: exit zero, retained at
  `/tmp/dadeto-2gx2-audit.json`.
- `node --experimental-vm-modules node_modules/jest/bin/jest.js test/scripts/november-dependency-compatibility.test.js --runInBand --coverage=false`:
  seven tests pass. Tests resolve dependencies from their actual consumers,
  verify synchronous/asynchronous brace matching, cancellation after the first
  directory read, legacy callable APIs and repeated regex matching results.
  This is compatibility evidence, not a universal performance benchmark.
- A separate same-tree cancellation control using the original glob 10.5.0
  observed 23 reads at rejection and 91 additional reads within a 50 ms
  observation window. The patched 14.0.2 read once and performed zero further
  reads. Both rejected with the injected `probe-abort` reason. These are
  bounded observed counts; the test's first-read assertion also rejects the
  vulnerable control without requiring a timing benchmark.
- `npm run duplication`: zero clones,
  `/tmp/dadeto-2gx2-duplication.log`.
- `node node_modules/@stryker-mutator/core/bin/stryker.js run docs/quality/simulator-randomness.stryker.config.mjs`:
  seven mutants detected/killed at 100%, static enabled, exit zero;
  `/tmp/dadeto-2gx2-stryker.log`. The existing fixture is a real Stryker tool
  compatibility check, not new runtime source or a claim about unrelated logic.
- `DADETO_CHECK_IMPACT_SHARD_SIZE=40 npm run check`: exit zero. The complete
  no-coverage unit fallback and all eleven static gates pass, including the
  unchanged audit gate. Terminal summaries are in
  `/tmp/dadeto-2gx2-check.log`. This local pass is not full coverage/E2E evidence;
  exact pushed full CI remains required before closure.
- `npm run build`: exit zero, `/tmp/dadeto-2gx2-build.log`.
- `node node_modules/madge/bin/cli.js --circular src/core/build/generator.js`:
  seven files processed; no circular dependency found.

## Environment guidance

Use a separate worktree when another validation process uses the original
node_modules: installing patched dependencies must not change a running
mutation experiment. Sandbox DNS failures on registry reads resolve with
approved network access; they are distinct from a package regression.

This host is Lorandil. The Vaelith machine-local GitHub App key named in older
checkout instructions is absent. `gh auth status` reports an invalid stored
token, but a batch-mode GitHub SSH probe authenticates successfully as
MattHeard. Use the verified machine-local SSH route for pushes; do not print
credentials or copy another host's private key. Keep read-only CI inspection
separate from push authentication.
