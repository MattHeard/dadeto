# Dadeto deepmerge security backport

This private local package preserves the bundled CommonJS API of upstream
[deepmerge4.3.1](https://github.com/TehShrike/deepmerge/tree/v4.3.1) for Jest.
It is a repository-maintained backport, not an upstream patched release.

Original npm4.3.1 `dist/cjs.js` SHA-256:
`2e5160f84a1141bd927264afe4d15766f1e6cf07daef182b37ff53fea121de7d`.
The upstream MIT license is retained verbatim in LICENSE.

[GHSA-gcqx-w48m-w2h4](https://github.com/advisories/GHSA-gcqx-w48m-w2h4)
reproduces with null-prototype targets, null placeholders and an own `__proto__`
target property. Both target and source copy loops now reject `__proto__`,
`constructor` and `prototype` before reading values. All destination properties
are defined as own enumerable/writable/configurable data properties, preventing
inherited setters from intercepting a write. Other upstream behavior stays intact.

The root development dependency points to this exact local package; the
`$deepmerge` override applies that same specification to transitive consumers.
An explicit root reference avoids npm relative-link lockfile ambiguity. Never rename/relabel an
unchanged vulnerable dependency merely to pass audit. Security regression tests
resolve the actual package from jest-config, verify its identity and cover both
copy loops, nested/array inputs, accessors, symbols and documented merge options.
Remove this backport after a compatible upstream release includes equivalent
protection, re-run those tests against it and require a clean npm audit/check.

Bead: dadeto-sxun. Original vulnerable probe evidence:
`/tmp/dadeto-sxun-probe-before.json` (all three returned objects inherited the
injected flag; Object.prototype stayed unchanged).

The Playwright image copies this local package before its root `npm ci`; the
separate GCS proxy image installs its own package manifest and is unaffected.
A regression asserts the Docker install ordering, and a clean scratch install
using only the root manifests plus this package verifies actual resolution and
the exploit probes without relying on a populated working-tree node_modules.
