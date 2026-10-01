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
