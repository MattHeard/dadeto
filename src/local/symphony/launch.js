import { applyRunnerLaunch } from '../../core/local/symphony.js';

/**
 * @param {{
 *   status: Record<string, unknown>,
 *   statusStore: { writeStatus: (status: Record<string, unknown>) => Promise<void> },
 *   now?: () => Date
 * }} options
 * @returns {Promise<Record<string, unknown>>} Updated launched-run status.
 */
export async function launchSelectedRunnerLoop(options) {
  const now = options.now ?? (() => new Date());
  const status = options.status;
  const currentBeadId = getRequiredString(status.currentBeadId, 'currentBeadId');
  const currentBeadTitle = getOptionalString(status.currentBeadTitle);
  const currentBeadPriority = getOptionalString(status.currentBeadPriority);

  if (status.state !== 'ready') {
    throw new Error(
      `Cannot launch runner loop unless Symphony is ready. Current state: ${String(status.state ?? 'unknown')}.`
    );
  }

  const startedAt = now().toISOString();
  const launchedStatus = applyRunnerLaunch(status, {
    runId: `${startedAt}--${currentBeadId}`,
    startedAt,
    beadId: currentBeadId,
    beadTitle: currentBeadTitle,
    beadPriority: currentBeadPriority,
    launchRequest: `pop ${currentBeadId}`,
  });

  await options.statusStore.writeStatus(launchedStatus);

  return launchedStatus;
}

/**
 * @param {unknown} value Candidate string value.
 * @returns {string | null} Trimmed string or null.
 */
function getOptionalString(value) {
  if (typeof value !== 'string' || !value.trim()) {
    return null;
  }

  return value.trim();
}

/**
 * @param {unknown} value Candidate string value.
 * @param {string} fieldName Field name for the error message.
 * @returns {string} Trimmed required string.
 */
function getRequiredString(value, fieldName) {
  const normalized = getOptionalString(value);
  if (!normalized) {
    throw new Error(`Cannot launch runner loop without ${fieldName}.`);
  }

  return normalized;
}
