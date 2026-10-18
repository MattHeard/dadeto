/**
 * Resolve the heartbeat cadence shared by local check runners.
 * @param {string | undefined} value Environment override in milliseconds.
 * @returns {number} Positive heartbeat interval.
 */
export function resolveJestProgressIntervalMs(value) {
  const intervalMs = Number.parseInt(value ?? '3000', 10);
  return Number.isFinite(intervalMs) && intervalMs > 0 ? intervalMs : 3000;
}

/**
 * Start periodic status output while Jest is active.
 * @param {{intervalMs?: number, now?: () => number, write?: (message: string) => unknown}} options Reporter dependencies.
 * @returns {() => void} Stop function.
 */
export function createJestProgressReporter({
  intervalMs = resolveJestProgressIntervalMs(
    process.env.DADETO_CHECK_PROGRESS_INTERVAL_MS
  ),
  now = Date.now,
  write = message => process.stderr.write(message),
} = {}) {
  const startedAt = now();
  const intervalId = setInterval(() => {
    const elapsedSeconds = Math.floor(Math.max(0, now() - startedAt) / 1000);
    write(`[check-progress] Jest still running; elapsed ${elapsedSeconds}s.\n`);
  }, intervalMs);
  return () => clearInterval(intervalId);
}
