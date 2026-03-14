# 2026-03-13: keep Symphony auto-loop pinned to the active run
- **Unexpected hurdle:** The TUI auto-refresh kept overwriting the displayed/current bead once a run started, so the auto-loop could trigger a second launch before the first run finished.
- **Diagnosis path:** Traced the refresh handler through `bootstrapSymphony` and saw the rebuild always recalculated `state`/`currentBead*` from the tracker instead of keeping the running status that came from the stored `status.json`.
- **Chosen fix:** Let `refreshSymphonyStatus` read the previous persisted status and reuse the running state, bead fields, and active run metadata whenever `state === 'running'`, so subsequent refresh cycles keep waiting for the current run.
- **Next-time guidance:** If this race resurfaces, double-check whether the launcher is transitioning to `completed` before the refresh fires; the guard should only re-poll the queue once the stored run is gone.
