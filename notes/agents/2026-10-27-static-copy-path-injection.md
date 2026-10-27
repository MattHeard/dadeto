# Static copy path injection

Bead: `dadeto-w5p7`; parent: `dadeto-e1oz`; Rank 11 remains Active / Partial.

## Unexpected hurdle and diagnosis

`createCopyCore` already accepts a path adapter, but recursive file discovery,
directory copying and default copy-pair construction bypassed it through a
module-level node:path import. The existing tests mostly used native POSIX
operations, so both the injected and ambient implementation produced the same
strings and concealed the bypass.

Four initial tests with a non-native `::` path syntax all fail on the old code.
Bind the existing helper group within the copy factory and reuse its existing
join/path bundle; remove the direct built-in import. Preserve helper signatures,
explicit copy-pair overrides, recursive visit/copy order, filesystem adapters and
errors. Independent factories retain their own bundles. There is no new adapter,
compatibility module or namespace move.

## Local evidence

```sh
node --experimental-vm-modules node_modules/jest/bin/jest.js --runInBand --coverage=false test/core/build-copy-path-injection.test.js test/core/copy.test.js
npm run check:impact:run -- --files src/core/build/blog.js
npm run check -- --skip-tests
npm run build
node node_modules/@stryker-mutator/core/bin/stryker.js run docs/quality/static-copy.stryker.config.mjs
```

Initial focused run passes 2 suites / 42 tests. Scoped coverage passes 3 suites /
43 tests and collects the changed module with no uncovered lines/branches;
ESLint, core-parse and duplication pass. Afterward an independent-factory
isolation regression was added; mutation's initial run passes all 43 focused
cases. All ten split local static gates pass. These are separate from global
coverage and the exact asynchronous Full Check.

Before/after static build manifests compare relative filenames and SHA-256 of
all file contents. The first oracle wrongly expected the build helper itself to
be shipped as a browser asset; actual copy routing ships browser and root core
assets, not this build-only file. The corrected stronger invariant requires
complete equality: **all 1,119 files byte-identical**, no added/removed/changed
file. No difference is exempted. Report:
`/tmp/dadeto-w5p7-output-parity.json`; baseline:
`/tmp/dadeto-w5p7-public-before.json`.

Removed the touched module's sole existing recursive-dispatch mutation skip.
Whole-module harness enables static mutants and retains a 100% break threshold;
report `reports/mutation/static-copy.json` and log
`/tmp/dadeto-w5p7-mutation.log` must be inspected before claiming success.
No source exclusion or threshold reduction is introduced.

Next time: use non-native path results and two independent instances to detect
ambient dependencies; native path spies alone can miss a bypass. Derive build
parity expectations from actual shipped paths before allowing any exception.
Broader typed-boundary and built-in policy work remains under the parent Bead.

## Mutation failure and test hardening

The first whole-module experiment failed at 98.37%: 300 Killed, five Survived
(all static) and one Timeout, out of 306 mutants including 84 static mutants.
Retained baseline: `reports/mutation/static-copy.initial.json`. The five gaps
were the default ContentBlogData source/destination mapping and browser, core
browser and rental-search destinations. Add exact mapping assertions for every
browser route and both default content-data paths.

The always-directory mutant exposed unbounded fake directory trees: two test
readers returned a file at every nonexistent descendant. Make them return only
their declared valid directory entries and throw on an unexpected directory.
This asserts the filesystem contract and lets an invalid file traversal fail
immediately; it does not change production recursion or a timeout setting.

Focused hardening passes 2 suites / 51 tests and targeted ESLint. Runtime blob
`a1b7065577f96f76c9ed51539c3f12a62f9a3e4e` still equals pushed35cf8d4, so
the exact 1,119-file output parity evidence remains valid. The same full-module
mutation gate is being rerun; keep the quality Bead open until its terminal
report and exact pushed CI result. No mutation suppression or threshold change.

## Complete mutation evidence — 27 October 2026

The final whole-module rerun passes: **306/306 Killed**, including **84 static**
mutants, zero survivors/timeouts/ignored/uncovered mutants at the unchanged
100% threshold. Report `reports/mutation/static-copy.json` and summary
`reports/mutation/static-copy-summary.json` embed the exact runtime source; SHA-256
`94ea4c790607293341643c32cf5b772ec7b84611c66490dadd7df15163be4a10`.
Log: `/tmp/dadeto-w5p7-mutation-final.log`; wrapper exit zero. The initial five
static survivors and recursive fixture timeout are all resolved by stronger
tests; no production body, source/mutation exclusion or timeout setting changed.

Focused hardening passes 51 tests; all ten split local static gates pass.
Injection Full Check40587766084 succeeded for35cf8d4. Exact hardening
[Full Check40588740109](https://github.com/MattHeard/dadeto/actions/runs/40588740109)
at67765d9 remains tracked separately before closure. The source blob and
1,119-file output parity remain unchanged. Parent Rank 11 remains Partial.
