# Neon resolution browser parity

- **Unexpected hurdle:** The city-covenant fixture initially fell back to independent because a fulfilled Mae promise was seeded without its real consultation and service-delivery conditions.
- **Diagnosis:** The ending selector consumes the settled ledger; the final settlement recalculates relationship conditions and changes an unsupported promise to warning before resolution.
- **Fix:** Seeded only contract-valid, validator-approved end-of-campaign ledgers. The covenant fixture includes reviewed Atlas/Lumen settings, sufficient compute/cooling, actual staff assignments and a fulfilled Mae record. Each case then uses the real A/X controller path to settle and verifies the persisted resolution and epilogue.
- **Next time:** Before testing an ending fixture through save import, run `validLabSave` and execute the final `endShift`; these expose invalid or self-correcting campaign state before browser assertions.
- **Evidence:** `npx playwright test --config mosslight.playwright.config.ts mosslight-e2e/neon-covenant.spec.ts --grep "resolution is settled" --workers=1` passed 24/24 (phone/desktop, standalone/embedded). `npm run check` passed all 10 gates; global lines/statements/functions/branches each 100%, skipped 0, strict clones 0.
