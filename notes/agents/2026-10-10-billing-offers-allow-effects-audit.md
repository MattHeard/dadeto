# Public billing offers Allow Effects audit

- Unexpected hurdle: `npm run check` initially emitted a passing aggregate summary but returned nonzero because `/tmp` filled with Jest caches; a captured retry confirmed sandbox startup failed with `ENOSPC`.
- Diagnosis: `src/cloud/billing/index.js` injects `listActivePackages` and `billing.getCurrentPricingSnapshot` into core. Both perform Firestore reads only. `createBillingRuntime` constructs closures without invoking them. The public-offers core returns a response value; actual Express response writes remain in the cloud entrypoint.
- Chosen fix: No source change was warranted. Removed only inactive generated Jest cache directories (`/tmp/jest_rs` and `.tmp/jest_rs`), then ran `npm run check` with repo-local temp/cache paths and 40-file shards. Focused tests passed (2 suites, 29 tests); full check passed, process exit 0, all 10 gates, 11/11 local E2E, and 0 clones.
- Next-time guidance: Continue the sorted `src/cloud/**/index.js` audit after `billing/index.js` and `chronoflow-time/index.js`; `create-checkout-session/index.js` is next. Preserve the distinction between query functions injected into core and commands.
