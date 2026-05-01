# 2026-05-01 notion-codex backoff reset

- Unexpected hurdle: the Notion connector's update/comment parameter validation was stricter than the wrapper summaries suggested.
- Diagnosis path: inspected `src/local/notion-codex/poll.js`, the existing idle-backoff tests, and the task data-source schema to confirm the stale state survived launches from an idle streak.
- Chosen fix: clear `idleBackoffExponent` and `nextPollAfter` when the poller discovers actionable work and launches, then add a regression test for the launch-from-idle case.
- Next-time guidance: when a connector rejects a seemingly valid payload, retry with the explicit schema shape from the tool error instead of assuming the wrapper docs are exact.
