# Cozy House Adventure Acceptance

## Machine-Checkable Criteria
- [ ] `npm test -- --watchman=false --runInBand test/toys/2026-04-19/cozyHouseAdventure.test.js` exits with status 0.
- [ ] `npm run lint` exits with status 0 and reports no lint warnings for new toy files.
- [ ] `npm run check` exits with status 0.

## Evidence Collection
- Command log path: terminal transcript for this loop.
- Generated artifacts:
  - N/A (text adventure toy only).
- Test report path (if applicable): Jest stdout coverage report.

## Pass/Fail Rules
- Pass when all checklist commands succeed with no warnings/errors in output.
- Fail when any command exits non-zero or reports unresolved warnings/errors.
