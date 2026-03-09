## Context

`dadeto-sj40` targeted the next axis-helper complexity warning in `src/core/browser/inputHandlers/joyConMapper.js`.

## What changed

I extracted the two-condition gate inside `getAxisCaptureCandidate` into a tiny predicate helper, `isAxisCaptureCandidate`, and left the rest of the axis-selection flow untouched.

## Why this slice

The owned warning was a narrow complexity-only issue on one helper. A predicate extraction lowers the local branch count without widening into the surrounding reducer, payload, or handler warnings that still remain in `joyConMapper.js`.

## Evidence

- Direct `npx eslint src/core/browser/inputHandlers/joyConMapper.js --no-color` no longer reports `getAxisCaptureCandidate`.
- Remaining `joyConMapper.js` warnings are later helper and handler hotspots outside this bead.
- `npm test` passed after the refactor.
