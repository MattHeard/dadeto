# 2026-08-18: Joy-Con mapper mutation slice

- Unexpected hurdle: the full mapper generated 884 mutants and was not a bounded evaluator; the first two mutants took long enough to show timeout risk.
- Diagnosis path: split the file by helper ranges and started with `getClosestArticle` at lines 90-92, using the existing helper suite.
- Chosen fix: exposed the narrow helper through `joyConMapperTestOnly` and added assertions for the selector, returned article, and missing article behavior.
- Evidence: focused helper Jest 7/7, lint clean, and Stryker 2/2 killed with 0 survivors and 0 timeouts.
- Next-time guidance: keep large browser input-handler mutation runs range-bounded and reuse the helper-focused suites.
