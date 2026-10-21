# THREEFOLD Threadbound ledger destruction

## Retrospective

- **Unexpected hurdle:** The first brazier position was below the root crossing. Normal movement from Pell hit the crossing geometry, so the test helper could not reach the destruction target.
- **Diagnosis:** Reproduced the route with ordinary movement and checked the authored collision bounds. The evidence choice was valid only if players could travel around the obstacle, not merely if the target bounds were reachable in isolation.
- **Fix:** Moved the marked brazier into the upper passage, then verified Mara can travel from Pell to the brazier and activate it after discovery. Destruction is one-time, mutually exclusive with sharing and keeping the ledger private, hidden from the readable-record panel, saved under Weftways schema v3, and accessible through a separate outcome panel.
- **Next time:** Exercise the real route between authored targets early; an in-range check at a fixture position does not prove the target is reachable through scene geometry.
