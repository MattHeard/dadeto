# Parameter bag rollout: billing transaction handlers

- Unexpected hurdle: moving transaction handlers behind dependency factories required updating the shared transaction runner callback contract; running the billing suite and TSDoc check early caught the API and type boundaries.
- Diagnosis: five no-cache findings were handlers unpacking six Firestore transaction inputs. Stable database, clock, and lot-reader dependencies can be captured by one runtime-specific factory; transaction, normalized input, amount, and candidate lots remain explicit per-call values.
- Fix: added staged factories for resolve/release, balance reading, reserve, and charge operations. The transaction runner now calls handlers with transaction, normalized input, amount, and candidates. Persisted records, transaction sequencing, and response shapes remain in the existing operation bodies.
- Evidence: billing runtime Jest suite passed (26 tests); scoped ESLint and TSDoc passed; fresh no-cache scan reports zero findings in `billing-runtime-core.js`; `npm run build:cloud` passed; elevated `npm run check` passed all 10 gates, including unit/e2e, with zero clones and zero audit vulnerabilities.
- Next guidance: use the fresh global scan artifact referenced in the bead to select the next cluster; do not broaden this loop into general billing protocol changes.
