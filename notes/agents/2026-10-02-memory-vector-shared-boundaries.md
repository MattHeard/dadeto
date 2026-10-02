# Memory vector shared boundaries

The strict minTokens 14 report exposed redundant error-location forwarding,
copied memory-location labels, a required-helper implementation, and object
root normalization. Memory writers and list append now reuse the canonical
location labels; scalar writes use requireEnvHelper directly. Vector errors
rely on the existing default location, preserving explicit override support.
Object roots reuse commonCore predicates and normalization. Strict
prototype-based request parsing is deliberately unchanged.

The initial focused set omitted reference-list callers and could not prove
full list-adapter coverage. Expand it to test/toys/2026-05-28,
test/toys/2026-08-18 and test/toys/2026-08-20: 200 tests passed with all four
metrics at 100% for the three changed modules. Evidence:
`.tmp/memory-vector-tests-final.log` and
`.tmp/memory-vector-static-final.log`.

Lint rejected a redundant forwarding helper during extraction; the correct
repair was direct shared-helper calls, not an exemption. Mutation-ignore
comments in the touched vector module were removed.
