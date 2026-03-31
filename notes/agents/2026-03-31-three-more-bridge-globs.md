# 2026-03-31 three-more bridge-globs follow-up

- **Unexpected hurdle:** After re-enabling three bridge/helper coverage globs, I expected denominator risk, but these modules were either exercised transitively or straightforward enough to keep branch coverage stable.
- **Diagnosis path:** Removed only the three bridge-focused ignore patterns, ran full `npm test`, and verified aggregate branch percent plus remaining ignored-core count.
- **Chosen fix:** Kept code unchanged aside from `jest.config.mjs` because coverage stayed at 100% without additional branch surgery.
- **Next-time guidance:** Prioritize removing low-risk bridge glob excludes first; they often restore denominator fidelity with minimal code churn.
