# Generate-stats startup effects

- Unexpected hurdle: the existing cloud adapter module was already near the non-core 50-line limit, and tests import middleware adapters from that module directly.
- Diagnosis: the full check exposed the wrapper-size constraint, then the cloud adapter suite exposed the import contract after splitting startup wiring.
- Chosen fix: put synchronous startup adapters and request adapters in focused modules, re-export the established adapter names, and inject fresh startup permissions into parser setup and Firebase initialization for cloud and local callers.
- Next-time guidance: when splitting an adapter module to satisfy a repository size gate, preserve its existing public import paths and run the owning adapter suite before the aggregate check.
