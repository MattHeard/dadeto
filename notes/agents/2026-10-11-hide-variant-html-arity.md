# Hide variant HTML arity loop

- Unexpected hurdle: The static lint finding was inside a private helper whose focused tests are grouped under the feature directory rather than a file matching the helper name.
- Diagnosis: `removeVariantPayload` receives a named record from its sole caller and destructures eight fields at the function boundary.
- Chosen fix: Read each property explicitly from the `params` record; retain the helper's behavior and caller payload.
- Evidence: All four hide-variant-html Jest suites passed (46 tests), target no-cache lint and TSDoc passed, and `TMPDIR=/home/matt/dadeto/.tmp npm run check` passed all 10 gates, 11 E2E tests, 100% line/statement/function/branch coverage, zero clones, and zero audit vulnerabilities. Cloud-only findings reduced from 6 to 5.
- Next-time guidance: Locate the helper's directory test suites when it has no name-matched test. Next inventory candidate: `mark-variant-dirty/mark-variant-dirty-core.js`.
