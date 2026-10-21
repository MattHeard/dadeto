# THREEFOLD campaign-level Iri outcome state

- Unexpected hurdle: the existing runtime Jest suite exceeded its function-size limit when a new campaign regression was added, and TSDoc did not narrow the saved outcome object to named fields.
- Diagnosis and fix: moved the runtime regression into a dedicated campaign-outcomes suite; validated the untrusted saved object and the three allowed outcomes before using the record.
- Evidence: focused impact passed 23 suites / 269 tests with 100% statements and branches for changed core files, clean ESLint/core parsing, and zero clones. `npm run check` passed all 10 fast local gates; `npm run build` exited 0; `git diff --check` passed.
- Boundary: campaign fate state now persists independently and is accessible after discovery, but no route action establishes Iri's fate yet. Keep the next loop on explicit authored encounter milestones and do not infer fate from unrelated relay evidence.
- Tracking: reading the Beads queue still times out because the shared Dolt access lock is held. Do not remove or rebuild the lock; retry when it clears. Exact-head GitHub validation is pending for this slice.
