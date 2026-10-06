# Chronoflow design loop

- Unexpected hurdle: adding `docs/toys/chronoflow/` immediately made the manual checker expect a matching manual and exactly one blog-manifest reference.
- Diagnosis path: `npm run check` identified `manuals:check`; running `npm run manuals:check` directly showed the missing `manual.md`, and `scripts/check-toy-manuals.js` revealed its schema and manifest contract.
- Chosen fix: copied and filled all four mandatory template docs, added a schema-backed design handbook, and registered one beta CHRO1 design post without a playable adapter. The manual clearly states the game is not playable yet.
- Design decisions: pure deterministic fixed-step fluid solver; explicit volume accounting and level solution witnesses; only server time anchors tide phase; monotonic time measures elapsed duration after a server sample; stale sync pauses timed credit; offline practice is untimed and never consults device wall time.
- Next-time guidance: run `npm run manuals:check` as soon as a direct toy documentation folder appears. Next bounded slice is the pure fluid core proof with replay determinism and volume/bounds tests; add presentation and clock endpoint only after the core's mass and stability contract passes.
- Evidence: `npm run manuals:check` reported `Validated 77 toy manuals.`; `git diff --check` passed; full `npm run check` ended with `status=passed total=10 failed=0` and included 9/9 local Playwright tests.
