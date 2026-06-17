# Jest Core-Only Policy

Jest should only exercise `src/core/**`.

Any test currently covering logic outside `src/core` should be migrated to either:

- a new core module under `src/core/**`, if the logic belongs there, or
- the GCP Playwright e2e path, if the logic is environment-dependent integration.

This means non-core Jest coverage should not remain in place as wrapper smoke tests or thin integration checks. If a behavior needs Jest coverage, the behavior itself should live in `src/core`.
