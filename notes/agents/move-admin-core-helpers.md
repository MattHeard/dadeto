## Admin helpers relocation

- Unexpected: enlarging the shareable helper set meant the browser shim was no longer more than a re-export, so I removed the redundant definitions and kept the shared helper logic in `src/core/browser/admin/core.js`.
- Diagnosed by tracing the exports—since nothing else imports `src/browser/admin-core.js` directly aside from downstream browser modules, simply moving the helpers and keeping the shim minimal preserved behavior while cleaning up duplication.
- Lesson: when migrating helpers closer to the core layer, verify that the shim modules still export exactly what downstream code imports so you don’t accidentally drop functions during refactors.
- Follow-up idea: consider consolidating these helpers into a dedicated `core/browser/auth-utils.js` file if more shared utilities accumulate, so the admin core file doesn’t drift toward a mixed concern.
