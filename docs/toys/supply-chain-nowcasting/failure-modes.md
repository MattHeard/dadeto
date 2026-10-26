# Supply-chain Nowcasting Failure Modes

Document expected breakpoints and promote observed failures into reusable guidance.

## Initial Predicted Failure Classes
- Setup/configuration mismatch: standalone asset or route omitted from the build.
- Invalid or missing inputs: missing/duplicate IDs, unit mismatch, negative demand/capacity, or impossible paths.
- Dependency/service unavailable: not applicable; the toy must remain offline.
- Non-deterministic timing or ordering: equal mitigation scores reorder between runs.
- Environment-specific behavior: browser import/export or layout differs on narrow screens.

## Detection Signals
- Error signatures/log lines: explicit field-level validation issues; no swallowed planner failures.
- Observable symptoms: empty rankings despite feasible plans, over-capacity deliveries, or a real-forecast claim on synthetic data.
- Failing command(s): focused Jest, `npm run check`, build, and browser smoke when integrated.

## First-Response Playbook
1. Capture failing command and full output.
2. Isolate whether failure is setup, logic, or environment.
3. Add/adjust harness or docs so failure becomes reproducible and diagnosable.

## Promoted from Real Failures
- Date: 2026-10-26
- Failure observed: Initial implementation not yet evaluated.
- Root cause: N/A.
- Fix implemented: N/A.
- Guardrail added (test/doc/harness): Explicit offline and synthetic-only boundary recorded here.
