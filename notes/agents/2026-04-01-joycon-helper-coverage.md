# 2026-04-01 — Joy-Con mapper helper coverage

- **Unexpected hurdle:** Branch coverage in `src/core/browser/inputHandlers/joyConMapper.js` was low because most logic lived in non-exported helper functions.
- **Diagnosis path:** Ran the full Jest coverage suite, inspected uncovered sections, and identified pure helper branches that could be tested directly without complex DOM lifecycle setup.
- **Chosen fix:** Exported a narrow `joyConMapperTestOnly` helper surface and added focused unit tests for button/axis capture selection, storage normalization, row-state logic, metadata formatting, and index normalization.
- **Next-time guidance:** Continue preferring test-only exports for large input-handler modules with dense branch logic; this keeps integration tests small while improving branch coverage in a durable way.
