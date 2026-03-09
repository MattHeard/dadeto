# 2026-03-08: guard the Symphony completion surface against fast exits

- **Unexpected hurdle:** A quickly exiting Ralph child raced the launch-status write; the handler wrote the idle outcome first, but the pending running-write landed afterward and the operator surface stayed stuck at `state: "running"`.
- **Diagnosis path:** I tracked the launch-status lifecycle, watched `launchSelectedRunnerLoop` write `status.json`, and confirmed the exit handler runs before the write finishes when `codex exec` exits immediately.
- **Chosen fix:** The runner exit handler now waits for the launch write to finish before touching `status.json`, and the launch flow signals that completion guard via a deferred promise. A dedicated Jest fixture proves the fast-exit path now leaves the file idle.
- **Next-time guidance:** When a detached worker updates persisted state, take the extra step of sequencing the writes so cached or concurrent updates don’t stomp each other—even if the detachment feels like “fire-and-forget.”
