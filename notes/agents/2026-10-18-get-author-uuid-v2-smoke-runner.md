# Retired get-author-uuid-v2 production smoke runner

The standalone production smoke runner was removed on 2026-10-19. Rank 1 verification now runs from the browser in the existing `gcp-test` Playwright job against its temporary `t-*` function, tenant, and Firestore database. See `test/e2e/get-author-uuid-v2.spec.ts` and `test/e2e/get-author-uuid-v2-auth.js`.
