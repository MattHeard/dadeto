# Mosslight Valley RPG foundation

- Unexpected hurdle: Dadeto's public toy contract is synchronous and recreated on each submission, so a full game cannot rely on hidden module globals for continuity.
- Diagnosis: existing stateful toys already solve this through serialized local persistence and deterministic frame payloads.
- Chosen fix: put the game in browser-core modules with an explicit runtime, save adapter, and canvas frame output; the toy adapter composes those pieces per call.
- Next-time guidance: add the dedicated full-screen presenter before expanding content volume, then keep it backed by the same simulation and renderer contracts.
