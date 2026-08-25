# Mutation scan: render-variant author-page

- Unexpected hurdle: Stryker does not recognize HTML files as executable mutation targets.
- Diagnosis: the target is a static one-line template with no JavaScript mutation surface.
- Fix: no source change was needed; recorded the parser boundary and successful associated dry-run.
- Evidence: Stryker reported no files to mutate and the associated focused suite passed 5 tests.
- Next-time guidance: record static HTML templates explicitly rather than treating an empty mutation report as missing evidence.
