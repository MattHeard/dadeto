# Browser E2E Rigour

## Outcome

Improve Dadeto's end-to-end browser testing so production-like user flows are exercised against locally served browser assets with enough rigour to catch real regressions before they reach `mattheard.net`.

## Priority

- MoSCoW: Should have. This is not the control plane itself, but it directly affects confidence in the deployed site and can catch regressions that unit tests and local helper tests miss.
- RICE: High reach and medium impact because one good production-like browser test can protect several toys and shared browser surfaces, with moderate setup effort.
- Cost of Delay: Medium-to-high. Each delay leaves the repo vulnerable to regressions that only appear in the built browser runtime, such as broken module exports or asset drift between `src/` and `public/`.

## Current state

Dadeto already has strong unit-style and fixture-style coverage in many areas, but the browser end-to-end surface is not yet rigorous enough to be trusted as a deploy gate. Recent regressions have shown the gap clearly: a source/public drift bug in `gamepadCapture` was able to survive until it appeared in the real browser runtime, which means the current test mix is still too indirect.

There are browser-facing tests in the repo today, but they do not yet form a clear, production-like end-to-end story that serves locally built or published assets, exercises real module loading in the browser, and proves the user-visible toy still works from the operator's perspective.

The first smoke harness now exists under `e2e/smoke.spec.js`, but recent runner attempts showed that the next useful scope is narrower than "full browser smoke assertions." The immediate gap is proving that `npx playwright test --config=playwright.config.js e2e/smoke.spec.js` can start, launch Chromium, and complete at all in the intended runner environment before adding more assertions or expanding coverage.

## Constraints

Keep the first slices small and high-signal. Prefer a few stable, production-like browser checks over a large brittle Playwright suite. Tests in this project should bias toward verifying what a real user can actually load and do in a browser, especially against locally served `public/` assets or other deployment-like surfaces, rather than recreating implementation details already covered by unit tests.

The goal is not snapshot-heavy browser automation or exhaustive coverage of every toy path. The goal is a trustworthy smoke-to-critical-path layer that can catch deployment-shape regressions, module/export mismatches, broken asset publication, and obvious runtime failures before release.

## Open questions

- Should the first rigorous browser checks run against a dev server, a static local server over `public/`, or both?
- Which deployed toy or shared browser flow is the best first anchor for a stable Playwright smoke test?
- How much of the browser E2E layer should be required in CI before it becomes too slow or flaky?
- Should these tests verify only happy paths first, or also include one failure-path regression harness?
- What is the smallest useful browser test that would have caught the recent `captureFormShared` export mismatch immediately?

## Candidate next actions

- Add one narrow bead whose only acceptance is that `npx playwright test --config=playwright.config.js e2e/smoke.spec.js` runs to completion and leaves operator-visible logs, without adding new assertions.
- Capture the exact Playwright/Chromium startup logs for the smoke harness so future beads can distinguish environment launch failures from harness failures.
- Define a tiny local serving harness for browser E2E runs so the test target matches deployed asset shape instead of raw source assumptions.
- Identify the first high-value toy or shared browser entry point whose successful load/use would catch several classes of deployment regression at once.
- Decide how browser-console errors, uncaught exceptions, and failed module imports should fail the E2E run by default.
- Add one bead specifically for proving the `gamepadCapture`/`captureFormShared` regression would have been caught by the new browser E2E layer.

## Tentative sequence

1. Define the thinnest local browser-serving path that mirrors the deployed asset shape closely enough to be meaningful.
2. Prove the existing Playwright smoke command can launch and complete in the intended runner environment, capturing logs before changing assertions.
3. Once the harness runs reliably, add one high-value smoke assertion set that catches load-time/runtime regressions in a real browser.
4. Expand from "page loads without runtime failures" to one or two actual user interactions on a chosen toy.
5. Add one regression-focused test for a recently missed class of bug, such as module export drift or missing published assets.
6. Tighten the browser E2E layer gradually only after the first checks are stable and trusted.

## Test philosophy

- Prefer behavior and runtime health over snapshots.
- Fail loudly on browser console errors, uncaught exceptions, and broken module imports unless a test explicitly allows them.
- Test the published/browser-consumed shape of the app, not just the source-tree internals.
- Keep tests few, explicit, and understandable enough that failures point to a real deploy risk instead of generic automation noise.
