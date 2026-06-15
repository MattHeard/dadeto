# Fractal Coverage Check Repair

- Unexpected hurdle: adding the beta fractal toy left coverage short, and generic JSON/fallback helpers tripped duplication and lint rules.
- Diagnosis path: ran focused Jest, `npm run tsdoc:check`, `npm run duplication`, `npm run lint`, then full `npm test` and `npm run check` after each meaningful fix.
- Chosen fix: added direct fractal generator tests for default, malformed, non-object, non-finite, clamped, and low-value inputs; reshaped helper control flow to avoid cloned parser/fallback idioms; passed branch state as objects to satisfy max-params.
- Next-time guidance: for small toy helpers, start with typed JSDoc, explicit branch coverage for numeric guards, and object-parameter recursion to avoid late check-gate churn.
