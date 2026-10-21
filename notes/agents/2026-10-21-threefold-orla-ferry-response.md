# THREEFOLD Orla ferry response

- Unexpected hurdle: coverage exposed independently conditional memorial and relationship disclosures even though both always derive from the same valid ferry-loss outcome; the clone scanner also caught duplicated source validation.
- Diagnosis: the two messages had separate guards for one campaign fact, which created unreachable partial-output states and repeated validation logic.
- Fix: derive both accessible records together from one validated campaign projection, with one passenger-outcome lookup and one source guard.
- Next time: keep related narrative projections together when they share the same saved fact, then run focused branch coverage and duplication checks before the full local gate.
- Open issue: Beads still cannot acquire the shared Dolt access lock. Do not remove the lock manually; retry tracker access when its owner clears it.
