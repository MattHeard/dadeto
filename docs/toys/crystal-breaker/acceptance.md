# Acceptance: Crystal Breaker

## Machine-Checkable Criteria
- [ ] `npm run test:unit` exits with status 0.
- [ ] `npm run test:unit` output includes coverage for `crystalBreaker` and the `text` shape presenter path.
- [ ] `npm run build` regenerates the blog artifacts with the `CRYS1` post and the `canvas-2d` default output.

## Evidence Collection
- Command log path: `artifacts/toys/crystal-breaker/commands.log`
- Generated artifacts:
  - `src/core/browser/toys/2026-06-28/crystalBreaker.js`
  - `docs/toys/crystal-breaker/*.md`
  - `src/build/blog.json`
- Test report path (if applicable): `artifacts/toys/crystal-breaker/test-report.txt`

## Pass/Fail Rules
- Pass when the toy tests and presenter tests pass and the blog build includes the new post.
- Fail when the toy cannot persist state, the presenter rejects `text`, or the generated post is missing.
