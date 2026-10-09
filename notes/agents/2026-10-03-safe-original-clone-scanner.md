# Retain the clone engine, remove the vulnerable finder

The new braces advisory GHSA-vfj7-8cjw-p6xm affected the old jscpd CLI's
fast-glob/micromatch dependency chain. No patched braces release was available.
A trial of jscpd 5.4 produced different detections, so upgrading the scanner
would not have preserved the existing gate's meaning.

The repository now directly pins the same `@jscpd/core` and
`@jscpd/tokenizer` 4.0.1 engines. `src/local/run-clone-scanner.js` injects
native filesystem and engine adapters into the pure core scanner. It uses the
working CommonJS tokenizer export: the old ESM export has extensionless reprism
imports that Node cannot resolve. Detection mode, MD5 token hashing, reverse
file processing, source-size/line defaults, and JSON clone schema are retained.
The strict config and minTokens 14 are unchanged.

Native recursive directory enumeration reproduced the old finder's exact
order. On the final implementation, an isolated invocation of the old CLI and
the new scanner both produced 121 clones, with byte-for-byte equal clone arrays
and equal statistics totals. This is stronger evidence than equal clone counts.

Unsupported configuration (including suppression options) fails explicitly.
Native enumeration does not traverse symbolic links: linked entries fail
explicitly rather than silently excluding code. If linked source is introduced,
implement and test equivalent enumeration before treating its scan as valid.
Engine errors propagate without publishing a stale success report.
JSON remains at `reports/duplication/jscpd-report.json`; self-contained escaped
HTML and its JSON copy remain under `reports/duplication/html/`.

Evidence:

- `npm install`: removed 69 unused packages; `npm audit --audit-level=low`:
  **zero vulnerabilities**. `.tmp/safe-clone-scanner-install.log`,
  `.tmp/safe-clone-scanner-audit.log`.
- Focused Jest: 20 tests in two suites pass; exact 100% lines, statements,
  functions, and branches for scanner and gate.
  `.tmp/safe-clone-scanner-final-tests.log`,
  `.tmp/safe-clone-scanner-final-coverage`.
- `npm run check -- --skip-tests`: nine gates pass, duplication alone fails
  at 121 clones. `.tmp/safe-clone-scanner-terminal-static.log`.
- Final equivalence: `.tmp/clone-scanner-final-equivalence.log` records
  `exactClones: true` and `exactTotals: true`.

To repeat the equivalence characterization without changing project dependencies:

```sh
TMPDIR=/home/matt/dadeto/.tmp npm exec --yes --package=jscpd@4.0.5 -- jscpd --config .jscpd.json --output .tmp/legacy-scanner-comparison
node src/local/run-clone-scanner.js .jscpd.json
```

Compare the reports' complete `duplicates` arrays and `statistics.total`, not
detection timestamps. The old CLI is only a temporary characterization tool,
not an installed project dependency or an audit exemption.
The clone-removal goal remains open until the report reaches zero and the full
aggregate exits successfully with exact global coverage.

Terminal full aggregate at `5249720ddb` also passed all unit tests and nine
browser tests. Exact global totals: 19,975 lines, 20,779 statements, 6,908
functions, and 9,799 branches all covered. The wrapper exited 1 solely for
duplication (121 clones); all nine other gates passed.
Artifact: `.tmp/safe-clone-scanner-full-check.log`.
