# Billing runtime JSDoc typing

- Unexpected hurdle: removing the pragma surfaced cascading errors from untyped Firestore callbacks and loose command payloads; a follow-up check also exposed that persisted purchase lots store `Date` timestamps while credit-lot calculations expect ISO strings.
- Diagnosis path: typed command payloads and transaction seams, then compared the lot writer, Firestore reader, and `consumeCreditLots` contract to identify the timestamp boundary.
- Chosen fix: added explicit billing input, transaction, pricing, and persisted-record types; normalize persisted lot `Date` values to ISO strings at the read adapter boundary while retaining `Date` values on writes.
- Evidence: `npm run tsdoc:check -- --pretty false`, focused ESLint, and `git diff --check` pass.
- Next-time guidance: verify Firestore timestamp representations at both write and read boundaries when using helpers with serialized timestamp contracts.
