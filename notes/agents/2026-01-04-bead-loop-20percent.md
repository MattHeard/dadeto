Closed fifteen beads in one go by focusing on the lingering JSDoc warnings in the TIC-tac-toe helpers and the battleship fleet placement helpers while following the new “run `npm test` before every bead close” rule.

Unexpected hurdle: the enforced `npm test` run before each bead worked as intended, but the repeated 6–8 second suites added noticeable latency; batching the doc fixes ahead of the bead loop helped keep the work focused even though the command was repeated for every ID.

Lesson learned: richer `@returns` text is the key to satisfying `jsdoc/require-returns-description`, and documenting why each helper returns what it does prepares the suite for future strict lint runs. Mention each test run in the bead comment so the audit trail stays intact.

Follow-up idea: the remaining warnings in `browserToysCore`, `toys-core`, and the other cloud helpers are next natural beads—stick to the same per-bead test+comment rhythm once they reach ready status.
