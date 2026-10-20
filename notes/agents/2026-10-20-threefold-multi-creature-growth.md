# THREEFOLD multi-creature growth outcomes

- **Unexpected hurdle:** Growth preview and committed creature outcomes only knew about the gatehouse rat, while the renderer also hid every non-rat creature.
- **Diagnosis:** Traced the read-only growth preview, player-inside-bounds check, grow reducer, normalized encounter state, schema-v3 restore path, and Mosslight object rendering. The rat's fight/bypass state is separate and must stay rat-specific.
- **Fix:** Generalized inside-bounds eligibility to authored creatures, recorded sorted `{creatureId, cause: 'growth'}` outcomes in encounter state, preserved the rat's existing fight/bypass rules, and rendered/highlighted all living scene creatures. Legacy schema-v3 saves omit the optional death list and normalize to no additional growth deaths.
- **Next time:** Keep physical eligibility, preview, committed outcomes, and saved identities on one ID set. Test both each bounds edge and roundtrip behavior before changing renderer labels.
- **Evidence:** Focused `npm run test:impact` passed 11 related suites / 164 tests; `npm run build` passed; `npm run manuals:check` validated 79 manuals; and `npm run check` passed all 10 local gates across five serial shards (960 suites / 6,641 tests), with zero clones and zero audit vulnerabilities. Exact-head GitHub Full Check is pending.
