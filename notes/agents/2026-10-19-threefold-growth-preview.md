# THREEFOLD growth preview

- Unexpected hurdle: placing the growth warning in the shared toast hid important storm and episode-closure messages in renderer cases.
- Diagnosis: the toast is the primary narrative/status channel; the preview needs a separate, compact visual label.
- Fix: share the physical intersection calculation between preview and committed growth, tint the affected geometry, and render an independent `A BREAKS …` label without changing simulation state or gating the action.
- Next-time guidance: keep the preview tied to the same collision predicate as growth. Add living-occupant warnings only when their physical occupancy and uncertainty are modeled; do not imply that unmodeled occupants are safe.
- Evidence so far: the first focused renderer run exposed the status-overwrite issue; after moving the preview label, the spatial, renderer, and simulation suites passed (3 suites, 62 tests). `npm run build` passed. Bead `dadeto-zbf7` records the remaining fast-check and exact-commit Full Check evidence.
