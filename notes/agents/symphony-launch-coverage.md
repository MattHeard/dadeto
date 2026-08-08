# Symphony launch coverage

- Hurdle: the existing launch suite covered the primary success/failure flows but left helper fallbacks and runner-exit error paths unexecuted.
- Diagnosis: the missing paths were deterministic lifecycle formatting, configured-launcher defaults, deferred completion, and status persistence edge cases.
- Fix: expose a focused helper test surface, add boundary tests, mock the launcher only for default-configuration tests, and remove an unreachable deferred resolver initializer.
- Guidance: test detached-run exit handling with successful, missing-status, wait-failure, and write-failure outcomes.
