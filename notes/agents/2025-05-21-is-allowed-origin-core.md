# get-moderation-variant origin helper refactor

- Challenge: the existing Cloud Function implemented `isAllowedOrigin` inline, so reusing it from tests required factoring without breaking the Express middleware wiring.
- Resolution: introduced a core helper that guards against non-array origin lists, updated the adapter to import it, and added targeted coverage to lock in the behavior.
