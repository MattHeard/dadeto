# Mutation scan: render-variant run

- Unexpected hurdle: eight wiring mutants survived because the tests verified only that handles existed.
- Diagnosis: callback return values, trigger metadata, and injected collaborators were not asserted at the wiring boundary.
- Fix: asserted render and delete-sentinel delegation, trigger region/path, builder metadata, console forwarding, and trigger handler invocation.
- Evidence: final focused scan killed all 15 mutants with no survivors or timeouts; the ESM suite passed 5 tests.
- Next-time guidance: for entrypoint modules, capture and invoke every injected closure and assert fixed trigger metadata.
