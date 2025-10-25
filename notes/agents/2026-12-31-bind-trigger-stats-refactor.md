# Bind trigger click helpers refactor

Identifying duplicate click-binding logic in `src/core/browser/admin/core.js` was straightforward, but I had to ensure the error messaging stayed consistent when delegating `bindTriggerStatsClick` to `bindTriggerRenderClick`. I preserved the stats-specific validation before invoking the shared helper so existing tests expecting the custom error string would keep passing.
