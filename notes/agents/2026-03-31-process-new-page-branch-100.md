# 2026-03-31 process-new-page branch-100 follow-up

- **Unexpected hurdle:** Re-enabling `process-new-page-core.js` in aggregate coverage surfaced a lingering defensive branch that never executed in practice.
- **Diagnosis path:** Removed the ignore glob, ran coverage, and checked the previously uncovered line in `buildIncomingOptionContext`.
- **Chosen fix:** Deleted the unreachable `if (!pageContext) return null;` guard because `resolveIncomingOptionPageContext` always returns a context object.
- **Next-time guidance:** When a branch stays uncovered after broad tests, confirm whether it is truly reachable before adding brittle scaffolding tests.
