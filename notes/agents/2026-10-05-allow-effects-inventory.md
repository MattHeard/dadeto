# AllowEffects inventory correction

- **Unexpected hurdle:** the first callback list mixed injected effects with core-created helper functions and missed writes performed through injected Firestore/Storage objects.
- **Diagnosis:** traced runtime adapters into core call sites and inspected actual writes/network methods. `writeModeratorReputations`, `applyCreditEvent`, and `invalidatePaths` are implementation helpers, not environment callbacks under those names. `submit-new-page.saveSubmission` and realtime voice session creation are confirmed callback/function candidates; cloud rendering and visibility paths need command-token tracing.
- **Chosen fix:** added per-request AllowEffects forwarding to submit-new-page persistence and per-connect permission forwarding to the realtime voice session POST; added cloud packaging, simulator binding, regression coverage, and type-aware lint scope.
- **Next-time guidance:** classify the concrete effect sink and its boundary before adding a token. Treat generic fetch callbacks as mixed read/write transports that need command-level classification, and keep direct database/storage object-client effects in a separately scoped migration.
