# Shared spacetime result formatting

Spacetime temporal relation and world-line toys now use the existing `formatToyResult` serializer for successful output; temporal relation also uses `formatToyError` for validation failures. Keep readable two-space JSON, property order and the original caught `.message` behavior. Do not substitute the compact fulfillment serializer: its response formatting and error contracts differ.

The new byte-string regression locks world-line success ordering/indentation and both validation envelopes. Acceptance covers the 2026-08-19 suites plus `test/core/browser/toys/formatToyError.test.js`, with exact coverage on both toys and the shared formatter. Artifacts: `.tmp/spacetime-format-tests.log`, `.tmp/spacetime-format-coverage`, `.tmp/spacetime-format-static.log`.

The full pre-refactor checkpoint `.tmp/geodesic-checkpoint-full.log` failed only strict duplication (139 clones) with exact global 100% coverage. The broader completely green aggregate goal remains tracked in dadeto-aaou.
