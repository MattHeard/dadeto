# THREEFOLD Iri recorded confession

## Retrospective

- **Unexpected hurdle:** The existing report log intentionally leaves Iri's knowledge unresolved, so the new admission needed a clear prerequisite and a separate disclosure without rewriting older evidence.
- **Diagnosis:** The watchkeeper lead is already persisted in the Broken Gate witness ledger, and `closedBy: 'reported'` already distinguishes filing from road departure. Both survive the existing save codec.
- **Fix:** Derive the first-person confession from those existing facts, expose it through the shared accessible disclosure panel, and add no save field or migration. Tests cover the report prerequisite, export/import, missing lead, road departure, alternate scenes, and missing page nodes.
- **Next time:** When adding an authored record after an existing closure, derive it from canonical saved evidence and closure state, then test both the simulation frame and the accessible page adapter.
