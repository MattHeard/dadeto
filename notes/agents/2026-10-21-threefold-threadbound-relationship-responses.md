# THREEFOLD Threadbound relationship responses

- Unexpected hurdle: the small-world routes saved physical outcomes, but their renderers only described those outcomes and never showed how Pell or Iru responded to Mara.
- Diagnosis: `flowChoice` and `spiderFate` are already canonical, validated, and roundtrip through each route's isolated schema-v1 save; a second relationship field would duplicate state and could drift.
- Chosen fix: derive each character's response directly from the saved route outcome, keep the physical consequence in the same message, and test that both responses survive export/import.
- Next-time guidance: use canonical outcomes for local character reactions. Add a campaign ledger only when a later story needs to aggregate choices across scenes; keep reactions descriptive rather than scoring morality.
