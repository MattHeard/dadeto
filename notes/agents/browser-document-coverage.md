# Browser document facade coverage

- Unexpected hurdle: the module had no dedicated suite and its module-level environment guard could only be reached before the first facade installation.
- Diagnosis: broad helper coverage also required exercising unsupported timer, animation-frame, and gamepad APIs, plus the interactive-component fallback branches.
- Fix: added a direct facade suite with a complete browser-global double and explicit supported/unsupported API cases.
- Next-time guidance: for a large stateless facade, drive the returned handle as an API table and separately test environment guards and optional platform capabilities.

## Follow-up verification

- Existing focused tests cover this module completely.
- Evidence: `NODE_OPTIONS=--experimental-vm-modules npx jest test/core/browser/document.test.js --runInBand --coverage --silent --collectCoverageFrom='src/core/browser/document.js' --coverageReporters=text-summary` — 1 suite, 2 tests passed; statements 171/171, branches 22/22, functions 73/73, lines 142/142.
