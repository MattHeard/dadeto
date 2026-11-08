# First trusted-core source relocation

Owning bead: `dadeto-topt`; parent preflights: `dadeto-qtxd` and `dadeto-eg7y`.
This is one dependency of the planned report migration, not completion of the
[typed-logic architecture spec](https://app.notion.com/p/3ff700afc301811ab16fcfab82168d28).

Move the shared classifier from `src/core/local/logic-source-paths.js` to
`src/logic/core/local/logic-source-paths.js` without changing its bytes or exports.
Both sources have SHA-256
`0927efd9243cf8ada6f62570f2942d0d5aa162a52445a757979d4a4e4307216a`.
The old file is absent; there is no forwarding implementation. The root list
continues to include legacy core until its remaining modules have migrated.

Update the real consumers: Jest/Stryker/ESLint configuration, serial coverage
runner, dependency/parse/thin policies, impact/report logic and their tests.
A search limited to root JSON/CJS/MJS files missed `eslint.config.js`; search
all active file types before claiming a dependency closure.

Focused mutation sandboxes also import the classifier through Jest configuration.
Literal imports alone are insufficient: broad legacy-core copy manifests had
implicitly supplied this dependency. Expand their copied inputs to both target
namespaces, retaining their exact mutation scopes, thresholds and static settings.
The narrow lineage/refund/classifier manifests point to the actual new file.
Bootstrap every affected harness with its normal configuration:

```sh
node node_modules/@stryker-mutator/core/bin/stryker.js run docs/quality/parse-gate.stryker.config.mjs --dryRunOnly
```

The installed Stryker schema defines this as initial test execution without
active mutation testing. Its results prove bootstrap/import compatibility only;
they do not replace full mutation evidence for any unrelated module. Retained
per-config logs and `reports/mutation/first-source-bootstrap/summary.json` record
the complete check.

## Evidence

- `/tmp/dadeto-topt-focused.log`: six suites / 68 tests pass, all four metrics
  100% for the actual destination module, including compiler/lint/dependency,
  global discovery, impact and report consumer fixtures.
- `/tmp/dadeto-topt-mutation.log`: 14/14 killed, including four static mutants,
  no ignored/surviving/timed-out mutants at the unchanged 100% threshold. The
  report embeds the exact destination bytes and matching SHA-256 above.
- `git diff HEAD --summary` recognizes a 100% rename; the former path is absent.
- All 17 other focused mutation configurations complete their initial-test-only
  bootstrap with exit zero; the per-config summary above retains each log.
- Site and cloud assembly pass. `npm run verify:cloud-packages` verifies 27
  Terraform function packages, 713 reachable modules and 1,234 imports; see
  `/tmp/dadeto-topt-{build,cloud-build,cloud-verify}.log`.
- Initial mutation execution was refused because automatic approval review hit
  its usage quota. The normal reviewed retry succeeded after resumption; no
  approval path was bypassed.

Static/public copying selects root-level core, browser and other named runtime
trees, not the local tooling subtree. Cloud assembly selectively copies its
`express-app-deps.js` local helper, not this classifier. Its actual consumers are
local quality/configuration tools. Still verify site/cloud assembly and package
imports before closing; inspected plans alone are not terminal build evidence.

Keep rename/deletion diagnostics visible rather than masking absent new coverage.
The report-module boundary parsing and the rest of the legacy tree remain future
work. Generator mutation manifests on the separate pending PR must gain the same
destination dependencies when that branch integrates this relocation.
