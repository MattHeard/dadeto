## Admin config cleanup
- Removed the unused `src/core/admin-config.js` after realizing only the test referenced it; double-checked that no runtime module imported `src/core/admin-config.js` before deleting.
- Learned to follow exports deeper: the config just re-exported `ADMIN_UID` from `src/core/common-core.js`, so the test can import that directly and we avoid an extra module to maintain.
- Follow-up: watch for similar "wrapper" modules with zero runtime use to keep bundle size tight; consider pruning any remaining `src/root/` helper wrappers if future work reveals they are dead as well.
