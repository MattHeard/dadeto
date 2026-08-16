# npm check recovery

- Unexpected hurdle: `npm run check` initially failed in the sandbox with `EPERM` when Jest and parse checks spawned Node subprocesses.
- Diagnosis: an escalated run separated environment failures from repository failures. A webhook coverage fixture lacked an event id; ESLint referenced four rules removed from `eslint-plugin-jsdoc` 63.2.2; the overexposed-export exemption reader was unused.
- Fix: corrected the webhook fixture, removed obsolete ESLint rule references, and applied the configured overexposed-export exemption baseline.
- Next time: run the full check with subprocess/network permissions. Remaining backlog is tracked by `dadeto-7ch`, `dadeto-dit`, `dadeto-8f5t`, and new bead `dadeto-y8m6` for nine duplication clones.
