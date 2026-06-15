# npm audit fix — 2026-06-15

- **Unexpected hurdle:** `npm audit fix` did not clear the report because the remaining findings came from toolchain transitive dependencies, not the app packages themselves.
- **Diagnosis path:** Upgraded the direct devDependencies that own the vulnerable tree, then used `overrides` for the remaining `js-yaml` and `qs` transitive packages.
- **Chosen fix:** Bumped Babel/Jest/Playwright/Stryker/dependency-cruiser to current releases and pinned `js-yaml@4.2.0` plus `qs@6.15.2` in `package.json` overrides.
- **Next-time guidance:** When audit failures survive a normal fix, check whether the source is a transitive tool dependency and prefer a narrow override over a broad `--force` upgrade.
