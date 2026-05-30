# Acceptance: Memory Scalar/Vector Write

## Machine-Checkable Criteria
- [ ] The toy appears in Dadeto blog metadata as `MEMO3`.
- [ ] JSON input can write a scalar to a missing nested temporary path.
- [ ] JSON input can write a vector to permanent memory.
- [ ] Missing nested containers are constructed, including numeric path segments that imply arrays.
- [ ] `MEMO2` can read back values written by `MEMO3`.
- [ ] Malformed requests and unsupported memory locations return structured JSON errors.
- [ ] `node --experimental-vm-modules ./node_modules/.bin/jest --watchman=false --runTestsByPath test/toys/2026-05-28/memoryScalarVectorWrite.test.js` exits with status 0.
- [ ] `npm test` exits with status 0 before closure.

## Evidence Collection
- Command log path: PR/testing notes and terminal output.
- Generated artifacts:
  - `public/blog.json`
  - `public/index.html`
  - `public/core/browser/toys/2026-05-28/memoryScalarVectorWrite.js`
- Test report path (if applicable): Jest terminal output and coverage artifacts from `npm test`.

## Pass/Fail Rules
- Pass when the targeted MEMO3 test passes, full `npm test` passes, and generated blog metadata includes `MEMO3`.
- Fail when any command exits non-zero, read-back via `MEMO2` is not covered by tests, or generated metadata omits `MEMO3`.
