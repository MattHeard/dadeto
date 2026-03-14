import path from 'node:path';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

/**
 * @param {{
 *   statusPath: string,
 *   logDir: string,
 *   mkdirImpl?: typeof mkdir,
 *   readFileImpl?: typeof readFile,
 *   writeFileImpl?: typeof writeFile
 * }} options
 * @returns {{
 *   readStatus: () => Promise<Record<string, unknown> | null>,
 *   writeStatus: (status: Record<string, unknown>) => Promise<void>
 * }} Status store for the local Symphony scaffold.
 */
export function createSymphonyStatusStore(options) {
  const mkdirImpl = options.mkdirImpl ?? mkdir;
  const readFileImpl = options.readFileImpl ?? readFile;
  const writeFileImpl = options.writeFileImpl ?? writeFile;

  return {
    async readStatus() {
      try {
        const rawStatus = await readFileImpl(options.statusPath, 'utf8');
        return JSON.parse(rawStatus);
      } catch (error) {
        if (error && typeof error === 'object' && error.code === 'ENOENT') {
          return null;
        }

        throw error;
      }
    },

    async writeStatus(status) {
      const logEvent = getStatusLogEvent(status);
      const logStartedAt = getStatusLogStartedAt(status);
      const logPath = path.join(
        options.logDir,
        'runs',
        `${logStartedAt.replaceAll(':', '-')}--${logEvent}.log`
      );

      await mkdirImpl(path.dirname(options.statusPath), { recursive: true });
      await mkdirImpl(path.dirname(logPath), { recursive: true });
      await writeFileImpl(options.statusPath, JSON.stringify(status, null, 2), 'utf8');
      await writeFileImpl(
        logPath,
        JSON.stringify(
          {
            event: logEvent,
            startedAt: logStartedAt,
            state: status.state,
            currentBeadId: status.currentBeadId ?? null,
            currentBeadTitle: status.currentBeadTitle ?? null,
            currentBeadPriority: status.currentBeadPriority ?? null,
            lastPollSummary: status.lastPollSummary ?? '',
            latestEvidence: status.latestEvidence ?? '',
            operatorRecommendation: status.operatorRecommendation ?? '',
            queueEvidence: Array.isArray(status.queueEvidence)
              ? status.queueEvidence
              : [],
            operatorArtifacts:
              status.operatorArtifacts && typeof status.operatorArtifacts === 'object'
                ? status.operatorArtifacts
                : null,
            activeRun:
              status.activeRun && typeof status.activeRun === 'object'
                ? status.activeRun
                : null,
            lastOutcome:
              status.lastOutcome && typeof status.lastOutcome === 'object'
                ? status.lastOutcome
                : null,
            lastLaunchAttempt:
              status.lastLaunchAttempt &&
              typeof status.lastLaunchAttempt === 'object'
                ? status.lastLaunchAttempt
                : null,
            eventLog: Array.isArray(status.eventLog) ? status.eventLog : [],
            workflowExists: status.workflow?.exists ?? false,
            trackerKind: status.config?.tracker?.kind ?? 'unknown',
          },
          null,
          2
        ),
        'utf8'
      );
    },
  };
}

/**
 * @param {Record<string, unknown>} status Current scheduler-visible status.
 * @returns {string} Log event name for the current status snapshot.
 */
function getStatusLogEvent(status) {
  if (status.activeRun && typeof status.activeRun === 'object') {
    return 'launch';
  }

  if (
    status.lastLaunchAttempt &&
    typeof status.lastLaunchAttempt === 'object' &&
    status.lastLaunchAttempt.outcome === 'failed'
  ) {
    return 'launch-failed';
  }

  if (
    status.lastOutcome &&
    typeof status.lastOutcome === 'object' &&
    typeof status.lastOutcome.outcome === 'string'
  ) {
    return status.lastOutcome.outcome;
  }

  return 'startup';
}

/**
 * @param {Record<string, unknown>} status Current scheduler-visible status.
 * @returns {string} Timestamp used to name the log artifact.
 */
function getStatusLogStartedAt(status) {
  if (
    status.activeRun &&
    typeof status.activeRun === 'object' &&
    typeof status.activeRun.startedAt === 'string'
  ) {
    return status.activeRun.startedAt;
  }

  if (typeof status.startedAt === 'string') {
    return status.startedAt;
  }

  throw new Error('Cannot write Symphony status without a startedAt timestamp.');
}
