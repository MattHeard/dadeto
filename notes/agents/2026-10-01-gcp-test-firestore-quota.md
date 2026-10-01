# GCP test Firestore quota repair

- Unexpected hurdle: successful `gcp-test` teardown abandoned its generated named Firestore database, eventually filling the shared project's 100-database quota; the next workflow then failed before Playwright could start.
- Diagnosis: inspected the failed workflow's Terraform logs and a successful run's destroy plan, which showed `deletion_policy = ABANDON`; the named `t-*` database remained present after Terraform removed it from state.
- Chosen fix: the named Playwright test database uses `DELETE` on destroy, while `(default)` and non-Playwright databases remain `ABANDON`; a focused regression test locks down that condition.
- Evidence: `npx jest test/scripts/gcp-test-workflow.test.js --runInBand` passed (7 tests); `terraform fmt -check -diff infra/main.tf` passed; `npm run check` passed all 10 gates, with 100% lines/statements/functions/branches; `npm run build` passed; `npx playwright test --config test/mosslight.playwright.config.ts` passed on phone and desktop projects.
- Open blocker: the project still has no free Firestore database slot. A read-only inventory showed test-shaped `t-*` names alongside `(default)` and `production-restore-2026-07-01-08-59`. Do not delete database contents without explicit authorization; the deployment workflow itself has not yet been rerun against a green GCP environment.
