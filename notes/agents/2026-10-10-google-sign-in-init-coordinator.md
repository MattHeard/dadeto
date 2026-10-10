# Google sign-in initialization coordinator

- Unexpected hurdle: the sign-in coordinator's dependency bag combined identity lookup, identity availability reporting, Firebase callback setup, and button rendering.
- Diagnosis: the parameter-bag rule expands consumed destructured properties, so replacing the bag with nested groups would preserve the violation. The initializer is orchestration across distinct operations, not one cohesive dependency object.
- Chosen fix: compose three named closures at the injected boundary and give the coordinator only `resolveAvailableAccounts`, `initializeSignIn`, and `renderSignInButton`. The coordinator still resolves and validates first, returns without initializing or rendering when the Identity client is unavailable, and otherwise initializes before rendering.
- Evidence: focused Google Identity tests passed (3 suites, 84 tests); `npm run lint`, `npm run tsdoc:check`, and elevated `npm run check` passed (10/10 gates, including 11/11 local E2E and zero clones). The targeted arity scan for `admin-core.js` now reports 6 findings, down from 7.
- Next-time guidance: keep responsibility-specific operation closures at composition boundaries; do not group unrelated injected fields into another transport bag to satisfy arity. Continue the remaining `admin-core.js` findings individually while global rule enforcement stays disabled.
