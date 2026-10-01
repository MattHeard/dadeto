# jscpd 14-token hardening

User goal: lower minTokens from 15 to 14, fix every aggregate quality failure,
use no suppression-based workarounds, and push frequent tested checkpoints.
Owning bead: dadeto-aaou. The initial stricter scan exposed 51 clones even
with the historical exclusion list. Full acceptance requires an actual zero
clone report and a terminal successful npm run check, not a checkpoint scan.

First slice: canvas shape dispatch now uses a fixed Map of renderer functions,
preserving unknown-shape no-op behavior without repeated dispatch branches.
Map exit and actor lookups use nullish fallback rather than truthy fallback;
HTML opening tags compose the existing helpers directly. Focused canvas,
world/simulation and HTML tests passed 51/51. The next scan found 48 clones.
Logs: /tmp/dadeto-jscpd14-focused.log, /tmp/dadeto-jscpd14.log.

Keep using exact pairs in reports/duplication/jscpd-report.json. Do not increase
minLines, narrow scan paths, add ignore patterns, or add source pragmas to mask
new findings. Historical gate exclusions and exemptions remain an explicit
cleanup obligation under the owning bead, not evidence of unrestricted success.
Use TMPDIR=/home/matt/dadeto/.tmp and coverage shard size 40 on this host.

The next checkpoint removed the historical jscpd ignore list, the dated ESLint
source exclusion and seven-file rule-relaxation block, all six parser exemptions,
both non-core size exemptions, and source jscpd/ESLint/Istanbul ignore pragmas.
The unrestricted scan initially exposed 217 clones and lint found 165 warnings.
Non-core-thin identifies webmcp.js (166 lines) and the rental search page
(59 lines), with a missing WebMCP factory wrapper. Parser checks require
escalation for classifier subprocesses; the sandbox EPERM is not a source bug.
Authoritative parser diagnostics currently name dailyWindow and
pointInsideWgs84Circle as validation helpers.

Shared assignment rejection, shift coverage, and single-record atomic append
helpers preserve the public contracts; focused safe/validated assignment tests
passed 25/25. Three historical assignment predicates now share one interval
resolver/overlap implementation, preserving old exported import locations.
Their focused test log is /tmp/dadeto-jscpd14-intervals.log. Subsequent scans
and final acceptance remain pending; this checkpoint is not a green claim.

Do not edit source while serial coverage shards are running: the first broad
run mixed instrumentation layouts from edited files and yielded inconsistent
coverage maps. The local config trim reuse also initially violated the
local-to-browser boundary; importing through the existing commonCore facade
fixed depcruise (/tmp/dadeto-jscpd14-depcruise.log).

Stable unrestricted aggregate run: /tmp/dadeto-jscpd14-unrestricted-check.log.
All twenty Jest shards passed assertions, but removing coverage ignores exposed
ten files below 100%, most prominently browser/staticJsonlTable.js (previously
entirely uninstrumented). Static gates failed lint, duplication, core-parse and
non-core-thin; depcruise and type checking passed. Do not mistake the static-only
summary for a successful aggregate when the earlier test/coverage phase failed.

Next slice split oversized arcade and webhook fixture tests into sequential
scenario helpers, sharing a context object to retain mutable values and closure
references. Async webhook helpers must be awaited in order; the first extracted
version missed async declarations and was corrected before landing. Five suites
now pass 176 tests (/tmp/dadeto-jscpd14-fixtures.log) and the targeted strict lint
run is /tmp/dadeto-jscpd14-test-lint.log. No assertions were removed.

Browser static-table behavior now has real DOM regression coverage for numeric
and string sorting, stable ties, priority changes, unknown sort buttons, empty
documents and malformed payloads. Its ts-nocheck pragma was removed and concrete
row/payload/DOM contracts added. Evidence: /tmp/dadeto-jscpd14-table.log and
.tmp/static-table-coverage/coverage-summary.json; type-check log
/tmp/dadeto-jscpd14-types.log. Remaining coverage gaps are in canonicalizer,
assignment feasibility, canonical/procurement fulfillment, feasibility wrappers,
and pricing. The goal remains active until all gates are green without masking.

The next coverage slice adds pricing fractional/unsafe-number rejection and
fulfillment optional-collection and invalid-operation regressions. A stock-in
point must resolve through the space-point registry; inline coordinates do not
bypass that contract. Removed the canonicalizer's unreachable private guard
instead of manufacturing an impossible public input. Focused pricing and
fulfillment suites pass 14 tests; strict lint for all three changed files passes.
The aggregate check is still pending and the owning bead remains open.
