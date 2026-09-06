# Service-area feasibility implementation

- Unexpected hurdle: the new shared geodesic and coordinate predicates tripped parser-boundary and duplication gates, while the full coverage run initially exposed simulator fixtures that omitted coordinates.
- Diagnosis: ran the focused object-minute rental suites, inspected each static-gate report, and traced the simulator failure to the newly required normalized possession points.
- Fix: promoted WGS84 distance math into shared core, injected the Sophie-Charlotte-Platz 5 km circle, added inclusive delivery/pickup feasibility before runner persistence, and updated all affected fixtures and tests.
- Next time: when adding a required normalized request field, update direct app, simulator, and both local/cloud E2E fixtures before the first full check.
