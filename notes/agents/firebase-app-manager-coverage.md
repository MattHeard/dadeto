# Firebase app manager coverage

- Hurdle: the manager was fully covered except for the context path that intentionally omits Express app construction.
- Diagnosis: existing tests covered default app inclusion and initialization errors but not the explicit `includeApp: false` contract.
- Fix: add a direct context test asserting the returned database/auth pair and confirming Express is not called.
- Guidance: test both sides of optional infrastructure construction flags when evaluating small dependency managers.
