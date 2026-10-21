# THREEFOLD Threadbound privacy choice

- Unexpected hurdle: the first focused run caught stale share-only screen labels and one copied interactable-clone; extending the existing Weftways test block also crossed its lint size limit.
- Diagnosis: the relay ledger had a saved share outcome but no mutually exclusive private outcome, and each physical target repeated the same deep-copy logic.
- Fix: add a reachable knot-cache choice, persist it in Weftways schema v2, migrate schema-v1 saves with no response selected, expose the selected response accessibly, and copy authored interactables through one shared helper.
- Next time: when adding a route-local choice, update the physical target, saved-state normalizer, save migration, frame copy, accessible panel, and route-level label tests as one vertical slice. Keep branch tests in bounded suites and check cloning before broad validation.
