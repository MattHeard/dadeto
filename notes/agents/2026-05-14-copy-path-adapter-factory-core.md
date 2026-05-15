# 2026-05-14 Copy Path Adapter Factory Core

## Context
- Bead: `dadeto-n6ab`
- Goal: pass `createPathAdapters` into `createCopyCore` instead of a constructed path adapter, and let core build path helpers internally.

## Chosen Fix
- Updated `src/build/copy.js` to pass the path adapter factory rather than a materialized adapter object.
- Updated `src/core/build/blog.js` so `createCopyCore` calls `createPathAdapters()` itself and derives the copy workflow helpers from that result.
- Updated `test/core/copy.test.js` to assert the factory is called and that the workflow still uses the constructed path helpers correctly.

## Evidence
- Focused `test/core/copy.test.js` passed after the refactor.
- Full `npm test` passed with 504 suites, 2561 tests, and 100% statements, branches, functions, and lines.
- Full `npm run check` passed, including lint, dependency-cruiser, duplication, the non-core thin-file check, and `npm audit` with 0 vulnerabilities.

## Next-Time Guidance
- Keep pushing path and filesystem construction inward only when the core module can own the resulting policy without leaking environment wiring back out into the entrypoint.
