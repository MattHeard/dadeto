# Visibility ratio arithmetic

Both rating paths now share the multiplication, contribution addition and safe
division policy. Their denominators intentionally differ: legacy uses rating
count plus one, weighted uses reputation plus normalized weight. Keep those
caller-owned. Do not multiply the legacy contribution by one: malformed string
ratings retain addition coercion, as the regression demonstrates.

Focused visibility suite passes 40 tests with exact 100% module coverage:
`.tmp/visibility-ratio-tests.log`. Static aggregate fails only duplication42,
down from 43: `.tmp/visibility-ratio-static.log`. Both builds pass:
`.tmp/visibility-ratio-build.log` and `.tmp/visibility-ratio-cloud-build.log`.
Detector settings and existing suppressions were not changed. Full aggregate
follows; dadeto-aaou and the zero-clone goal remain active.

Terminal full checkpoint: `TMPDIR=/home/matt/dadeto/.tmp
DADETO_COVERAGE_SHARD_SIZE=40 npm run check` exits 1; duplication alone fails
among ten outer gates, with 42 clones. Exact global coverage: lines 20327/20327,
statements 21179/21179, functions 7062/7062, branches 10203/10203. Evidence:
`.tmp/clone-goal-42-full-check.log` and `reports/coverage/coverage-summary.json`.
The zero-clone goal is still unfinished.
