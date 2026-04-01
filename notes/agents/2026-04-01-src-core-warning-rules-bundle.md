# 2026-04-01 – src/core warning rules bundle

- **Unexpected hurdle:** Some requested lint rules already existed globally, but the ask was to ensure explicit warning coverage for `src/core`.
- **Diagnosis path:** Reviewed the `src/core/**/*.js` override and confirmed only `no-restricted-globals` was scoped there.
- **Chosen fix:** Added `no-param-reassign`, `no-return-assign`, `prefer-const`, and `no-void` as warning-level rules in the src/core override.
- **Next-time guidance:** Keep src/core-specific enforcement grouped in one override block for easier audit against policy requests.
