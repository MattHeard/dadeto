# Deepmerge security backport for Jest

Bead `dadeto-sxun`; discovered while validating runner child `dadeto-tx59`.

## Diagnosis

The strict local audit newly reported five low entries through Jest30.4.2 /
jest-config30.4.2 / deepmerge4.3.1. GHSA-gcqx-w48m-w2h4 was reviewed27October;
upstream latest4.3.1 has no published patched release. npm's suggested Jest25.1.0
major downgrade was not a safe targeted fix. Audit severity policy is unchanged.

Three probes against the actual original dependency reproduced a hidden inherited
flag with a null-prototype target, nested null placeholder and own __proto__
target property. Object.prototype remained unchanged: checking only global
pollution would miss this defect. Original artifact:
`/tmp/dadeto-sxun-probe-before.json`.

## Chosen fix

Keep Jest unchanged. `vendor/deepmerge` contains the licensed upstream bundled
CommonJS implementation with a narrow security backport, explicitly identified
as private `@dadeto/deepmerge4.3.1-dadeto.1`, not a claimed upstream patched release.
Both target/source copy loops reject __proto__/constructor/prototype before
reading values; destination writes define own data properties rather than invoke
inherited setters. The README records original bundled-source SHA/provenance,
patch intent, license and removal conditions. No audit exemption is introduced.

The first patch only guarded the source loop because a textual replacement missed
the bundled target loop's semicolon. Four security regressions failed, proving
that an audit pass was insufficient. Correct both loops and assert no original
destination assignment remains. The final tests cover all three original probes,
nested/array variants, forbidden getters in both loops, inherited setters, cloned
arrays/objects, symbols, special values and documented custom merge policies.

npm also silently ignored the first linked-consumer override probe; repeat with a
packed consumer to establish behavior. The initial transitive-only file override
produced a nested relative-link mismatch. Use an explicit root development file
reference plus `$deepmerge` override, remove the verified broken stale nested
link/metadata and let npm revalidate the lock. The final lock has only root
node_modules/deepmerge -> vendor/deepmerge and the explicit vendor package record.
Both Jest and the root resolve/dedupe to that package.

The Playwright image installs the root manifest, so it must copy vendor/deepmerge
before npm ci. A regression asserts that ordering. The GCS proxy image installs
its own independent manifest/build context and needs no change. Actual image
execution remains in the existing GCP CI flow; no local Playwright was run.

## Evidence

- Eight focused suites /60 tests pass under the patched dependency:
  `/tmp/dadeto-sxun-focused-final.log`.
- The documented split fast local check (explicit focused tests, then
  `npm run check -- --skip-tests`) passes all ten gates, including unchanged
  low-severity audit: `/tmp/dadeto-sxun-static-final.log`.
- npm audit reports zero vulnerabilities; actual npm ls shows root and
  jest-config deduped to the identified backport.
- Clean npm ci in `/tmp/dadeto-deepmerge-clean-install-g7st5gyb`, with only root
  manifests plus the vendor package, exits0. Its real Jest resolver selects the
  package and all three exploit probes return clean=true. Logs/result:
  `/tmp/dadeto-sxun-clean-install-final.log`,
  `/tmp/dadeto-sxun-clean-install-result.json`.
- Earlier focused security failure and first lint-warning failure remain recorded
  in the Bead; no failure is retroactively described as passing.

Keep both Beads open until an exact pushed descendant Full Check proves the
complete suite/global coverage/E2E. Local checks and clean installation do not
prove those. No existing source or mutation surface was excluded and no gate
threshold was lowered. Next time, verify actual dependency resolution, vulnerable
behavior, patched behavior, license/provenance, install contexts and fresh-lock
behavior separately before accepting a clean audit.

## Final local receipt

The final documented split local check exits0: all ten static gates pass after
60 focused tests, including the Docker-context regression. Patched bundled-source
SHA-256: `dcaacd6cfdf4bc3342cb8ca591d4e2e858ef4a8fccd305fcb6a1dd06d80257a8`.

Pre-repair runner Full Check40649466701 atcab50c4 failed **only audit**. Its downloaded
artifact12799376885 confirms1,071suites /8,261tests all pass and all four global
coverage metrics are100%; runner coverage is100% for all four metrics. These
results prove the runner's complete unit/coverage evidence, not a passing overall
workflow or validation of this subsequent dependency backport. Report:
`/tmp/dadeto-full-check-40649466701/coverage/check-full-report.md`.
The repaired descendant workflow must succeed before either quality Bead closes.
