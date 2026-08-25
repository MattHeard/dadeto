# Mutation scan: openaiRealtimeCalls

- Unexpected hurdle: two string-literal mutants survived the first focused scan.
- Diagnosis: the tests checked only one multipart field and omitted the request method.
- Fix: asserted the serialized session field and exact `POST` method; the rerun killed both survivors.
- Next-time guidance: inspect request bodies and methods explicitly when mutation testing transport helpers.
