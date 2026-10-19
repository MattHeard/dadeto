# THREEFOLD Latchfolk Warning Loop

- Unexpected hurdle: changing the toy acceptance docs made the impact selector fall back to all unit tests, so the supposedly focused run took five serial shards.
- Diagnosis: the selector explicitly reports unsupported documentation paths and safely broadens to all-unit coverage; this was expected fallback behavior, not a hung run.
- Chosen fix: complete all five shards and preserve the broad fallback result in the Bead and acceptance record. The warning target is covered by a traversable route test, range and surge rejection, independent surge outcomes, and save migration checks.
- Next-time guidance: when a doc path triggers the all-unit fallback, report that reason up front and let the bounded serial shards finish; do not weaken test selection to hide it. Check any new interaction target from the actual starting position at the authored scale before relying on render visibility alone.
