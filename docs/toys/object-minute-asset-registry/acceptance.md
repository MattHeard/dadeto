# Acceptance: Object-minute Asset Registry

## Machine-Checkable Criteria
- [x] `node --experimental-vm-modules ./node_modules/.bin/jest --watchman=false --runTestsByPath test/toys/2026-08-16/assetRegistry.test.js` passes.
- [ ] `npm run check` exits with status 0.
- [ ] `npm run build` generates the beta public artifact containing `OBJE1`.

## Evidence Collection
- Command log path: `artifacts/toys/object-minute-asset-registry/commands.log`
- Generated artifacts: `public/`
- Test report path: focused Jest output.

## Pass/Fail Rules
Pass when the focused test, repository check, and beta build all succeed.
