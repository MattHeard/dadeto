# JoyCon metadata-rendering mutation slice

- Unexpected hurdle: metadata formatter helpers were covered, but the DOM-writing `renderMeta` adapter was not directly exercised.
- Diagnosis path: the bounded scan over lines 1584-1598 found two survivors in the renderer body and status path.
- Chosen fix: exposed `renderMeta` through the test-only surface and asserted disconnected status, connection class, index, and ID writes.
- Evidence: the verification scan killed both mutants; focused Jest, targeted ESLint, and diff checks passed.
- Next-time guidance: assert renderer adapters separately from pure formatting helpers.
