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
