# dadeto-u2py runner loop

- unexpected hurdle: `npm test -- --runInBand test/toys/2024-10-02/hello.test.js` still ran the full Jest suite because the repo test script wraps Jest coverage globally.
- diagnosis path: inspected `test/toys/2024-10-02/hello.test.js` and `src/core/browser/toys/2024-10-02/hello.js` to confirm the smallest exact-output surface was the hello toy.
- chosen fix: replaced the literal string assertion with behavior checks on the greeting shape, then verified with `npm test -- --runInBand test/toys/2024-10-02/hello.test.js` and repo-wide `npm test` (477 suites, 2366 tests passed).
- next-time guidance: keep the next migration slice similarly tiny; this one is already the minimal exact-output case in the toy set.
