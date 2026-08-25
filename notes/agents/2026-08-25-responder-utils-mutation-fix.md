# Responder utils mutation scan

- Unexpected hurdle: none; the focused responder test covered the complete small helper.
- Diagnosis: the authoritative scan instrumented 3 mutants and killed all 3.
- Fix: no production change was needed; existing response construction assertions were sufficient.
- Next time: retain exact status/body assertions for responder helpers.
