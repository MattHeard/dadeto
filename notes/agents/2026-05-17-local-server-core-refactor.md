# Local server core refactor

Unexpected hurdle: moving the local route wiring into `src/core/local/server.js` exposed a branch-coverage gap even after the launcher stayed thin.

Diagnosis path: the full check passed lint and dependency-cruise, but coverage still lagged until the tests exercised the core route registration surface directly instead of only the helper functions.

Chosen fix: inject the route dependencies into a single core app factory, then add focused tests that call the registered handlers with a fake app.

Next-time guidance: when migrating a launcher into core, cover the route wiring itself early so coverage failures point at the new seam instead of the old wrapper.
