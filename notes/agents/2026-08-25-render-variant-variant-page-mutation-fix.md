# Mutation scan: render-variant variant-page

- Unexpected hurdle: Stryker does not recognize HTML files as executable mutation targets.
- Diagnosis: the target is a static HTML template with no JavaScript mutation surface.
- Fix: no source change was needed; recorded the parser boundary and successful associated dry-run.
- Evidence: Stryker reported no files to mutate and the associated focused suite passed 5 tests.
- Next-time guidance: record static HTML templates explicitly as zero-mutant inventory boundaries.
