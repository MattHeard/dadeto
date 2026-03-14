# 2026-03-14 dadeto-7gxw runner loop
- unexpected hurdle: none—remaining snapshot-like assertions were already isolated in `test/toys/2025-07-05/getDend2Titles.test.js`.
- diagnosis path: reviewed the diff and confirmed only the `JSON.stringify` comparisons were still present, so the smallest change was to parse the helper output and compare against a concrete array.
- chosen fix: switched each `expect(...).toBe(JSON.stringify(...))` to `JSON.parse(...)` followed by `toEqual(...)`, then reran `npm test` (full suite + coverage summary) to prove the suite still passes.
- next-time guidance: when a bead is stuck with a ready diff, double-check whether the remaining assertions can be normalized before inventing new scaffolding—the change often fits inside the existing test file.
