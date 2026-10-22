# THREEFOLD ferry memorial

- Unexpected hurdle: the focused tests passed, but the first full local check found that the passenger state union also includes `aboard`, which the memorial must not describe as a completed ferry-loss outcome.
- Diagnosis: `tsdoc:check` caught an unsafe object index that the runtime test cases did not reject at type-check time.
- Fix: explicitly match only `evacuated`, `partial`, and `lost`; all other passenger states return no memorial. Added runtime coverage for malformed saves, and verified the disclosure is derived from Broken Gate storage without mutating Belltops state.
- Next time: when deriving narrative from saved enums, account for every valid state, including states that intentionally have no narrative projection.
- Open issue: Beads could not acquire the shared Dolt access lock despite no visible `bd` or Dolt process. Do not remove the lock manually; retry tracker access when the owner clears it.
