# Iterative Loop Manifesto

1. **One bounded loop at a time.** Start with one clearly scoped change before considering parallel work.
2. **Define acceptance evidence first.** A loop is not ready until success signals (tests, artifacts, logs) are named upfront.
3. **Optimize for visible value per loop.** Deliver either user-facing improvement or a reusable loop artifact (test/harness/doc/automation).
4. **Prefer bricks over rewrites.** Build systems through additive, composable steps that can be observed and reverted safely.
5. **Treat failures as data channels.** Every failing command, flaky test, or runtime symptom is a source of model correction.
6. **Encode repeated failures into guardrails.** If a failure happens twice, add harnessing, docs, or automation so it is caught earlier.
7. **Keep evidence close to the change.** Link outcomes to concrete artifact paths, command outputs, and source files in the repo.
8. **Single-loop-first until disproven.** Multi-agent or multi-track execution is a fallback triggered by demonstrated bottlenecks.
9. **Shift-left on diagnosis.** Reproduce minimally, isolate surface area quickly, and lock the root cause before broad refactors.
10. **Use cheapest reliable evaluator first.** Start with narrow unit checks, then expand to heavier validation only as risk increases.
11. **Prefer deterministic feedback paths.** Stabilize tests/harnesses to reduce nondeterminism and accelerate iteration confidence.
12. **Preserve architectural boundaries.** Keep side effects in environment adapters and maintain `core` domain portability.
13. **Document decisions with next-loop utility.** Capture what changed, why it worked, and what should be watched next.
14. **Finish with landing-the-plane discipline.** Sync, test, commit, and publish state so no useful loop output remains local-only.

15. **Let required validation finish.** Keep the implementation slice bounded, but do not interrupt a required acceptance check once it has started.
16. **Decompose recursively from user value.** Define each project as a desired outcome plus user stories, then split it into small, independently testable milestones that each deliver observable value.
17. **Treat milestones as vertical slices.** A milestone should cross the relevant state, UI, network, or resilience boundary far enough to produce user-visible behavior, not just an internal technical step.
18. **Rebuild the tree after each milestone.** After one milestone lands, reevaluate the parent goal and remaining branches, then instantiate only the next smallest executable slice.
19. **Prefer learning over fixed plans.** If a milestone cannot be completed in the time box, treat the failure as information, decompose further, and adjust the tree to match reality.
