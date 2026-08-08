# Report-for-moderation core coverage

- Hurdle: the initial suite covered only valid reports and basic validation, leaving adapter and urgency branches untested.
- Diagnosis: remaining paths were deterministic identity fallbacks, duplicate detection, CORS defaults, urgency clamping, and response sender selection.
- Fix: add direct tests for all those branches, including string, JSON, status-only, and null response bodies.
- Guidance: exercise both the domain handler and Express adapter when a core module owns response serialization.
