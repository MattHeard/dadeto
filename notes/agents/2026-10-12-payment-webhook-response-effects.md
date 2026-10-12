# Payment webhook response and logging effects

- Unexpected hurdle: the webhook wrapper already passed AllowEffects to event ledger writes and credit transactions, but it still wrote responses and logged caught failures directly from core.
- Diagnosis: traced `createPaymentWebhookIndexHandler` through the domain handler; identified response header/status/json/send calls and `console.error` as the remaining direct command effects in this slice. Read-only Firestore lookups remain queries under the current policy.
- Fix: added permission-first cloud adapters for response delivery and failure logging, and made the wrapper require and forward the request capability for both. Preserved the 201 response promotion for applied credits.
- Verification: focused Jest passed (4 suites / 34 tests); `npm run lint`, JSDoc type check, non-core size gate (290 files), full `npm run check` (all gates, full coverage, 11 local E2E tests, 0 clones, 0 audit vulnerabilities), and `npm run build:cloud` passed.
- Next time: continue the source-cloud audit after payment-webhook; inspect remaining webhook Firebase/Firestore/Stripe setup and purchase billing callbacks for additional command effects.
