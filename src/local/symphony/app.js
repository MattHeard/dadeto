import express from 'express';
import { applyRunnerOutcome } from '../../core/local/symphony.js';

/**
 * @param {{
 *   initialStatus: Record<string, unknown>,
 *   statusStore: {
 *     readStatus: () => Promise<Record<string, unknown> | null>,
 *     writeStatus?: (status: Record<string, unknown>) => Promise<void>
 *   },
 *   launchSelectedRunnerLoop?: (options: {
 *     status: Record<string, unknown>,
 *     statusStore: { writeStatus: (status: Record<string, unknown>) => Promise<void> },
 *     repoRoot?: string
 *   }) => Promise<Record<string, unknown>>,
 *   repoRoot?: string
 * }} options
 * @returns {(req: import('express').Request, res: import('express').Response, next: import('express').NextFunction) => Promise<void>} Status handler for the local Symphony app.
 */
export function createSymphonyStatusHandler(options) {
  return async (_req, res, next) => {
    try {
      const storedStatus = await options.statusStore.readStatus();
      const baseStatus = storedStatus ?? options.initialStatus;
      const reconciledStatus = await reconcileOrphanedRun(baseStatus, options.statusStore);
      res.json(reconciledStatus);
    } catch (error) {
      next(error);
    }
  };
}

/**
 * @param {{
 *   initialStatus: Record<string, unknown>,
 *   statusStore: {
 *     readStatus: () => Promise<Record<string, unknown> | null>,
 *     writeStatus?: (status: Record<string, unknown>) => Promise<void>
 *   },
 *   launchSelectedRunnerLoop?: (options: {
 *     status: Record<string, unknown>,
 *     statusStore: { writeStatus: (status: Record<string, unknown>) => Promise<void> },
 *     repoRoot?: string
 *   }) => Promise<Record<string, unknown>>,
 *   repoRoot?: string
 * }} options
 * @returns {(req: import('express').Request, res: import('express').Response, next: import('express').NextFunction) => Promise<void>} Launch handler for the local Symphony app.
 */
export function createSymphonyLaunchHandler(options) {
  return async (_req, res, next) => {
    try {
      const launchImpl = options.launchSelectedRunnerLoop;
      if (!launchImpl || typeof options.statusStore.writeStatus !== 'function') {
        res.status(501).json({
          error: 'Symphony launch trigger is not configured.',
        });
        return;
      }

      const storedStatus = await options.statusStore.readStatus();
      const status = storedStatus ?? options.initialStatus;
      const launchedStatus = await launchImpl({
        status,
        statusStore: options.statusStore,
        repoRoot: options.repoRoot,
      });

      res.status(202).json(launchedStatus);
    } catch (error) {
      next(error);
    }
  };
}

/**
 * @param {{
 *   initialStatus: Record<string, unknown>,
 *   statusStore: {
 *     readStatus: () => Promise<Record<string, unknown> | null>,
 *     writeStatus?: (status: Record<string, unknown>) => Promise<void>
 *   },
 *   launchSelectedRunnerLoop?: (options: {
 *     status: Record<string, unknown>,
 *     statusStore: { writeStatus: (status: Record<string, unknown>) => Promise<void> },
 *     repoRoot?: string
 *   }) => Promise<Record<string, unknown>>,
 *   repoRoot?: string
 * }} options
 * @returns {import('express').Express} Express app for the local Symphony status shell.
 */
export function createSymphonyApp(options) {
  const app = express();
  const sendStatus = createSymphonyStatusHandler(options);
  const launchSelectedBead = createSymphonyLaunchHandler(options);

  app.get('/api/symphony/status', sendStatus);
  app.get('/', sendStatus);
  app.post('/api/symphony/launch', launchSelectedBead);

  app.use((error, _req, res, _next) => {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown server error',
    });
  });

  return app;
}

async function reconcileOrphanedRun(status, statusStore) {
  if (
    !status ||
    typeof status !== 'object' ||
    !status.activeRun ||
    typeof status.activeRun !== 'object'
  ) {
    return status;
  }

  if (typeof statusStore.writeStatus !== 'function') {
    return status;
  }

  const pid =
    typeof status.activeRun.pid === 'number' ? status.activeRun.pid : null;
  if (pid === null) {
    return status;
  }

  if (isProcessAlive(pid)) {
    return status;
  }

  const beadId = getActiveRunBeadId(status);
  if (!beadId) {
    return status;
  }

  const outcome = {
    beadId,
    beadTitle:
      typeof status.activeRun.beadTitle === 'string'
        ? status.activeRun.beadTitle
        : null,
    outcome: 'blocked',
    summary: buildOrphanedRunSummary(status.activeRun, pid),
  };

  const updatedStatus = applyRunnerOutcome(status, outcome);
  await statusStore.writeStatus(updatedStatus);
  return updatedStatus;
}

function getActiveRunBeadId(status) {
  if (status.activeRun && typeof status.activeRun === 'object') {
    if (typeof status.activeRun.beadId === 'string' && status.activeRun.beadId) {
      return status.activeRun.beadId;
    }
  }
  if (typeof status.currentBeadId === 'string' && status.currentBeadId) {
    return status.currentBeadId;
  }

  return null;
}

function isProcessAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if (error && typeof error === 'object') {
      if (error.code === 'ESRCH') {
        return false;
      }
      if (error.code === 'EPERM') {
        return true;
      }
    }

    throw error;
  }
}

function buildOrphanedRunSummary(activeRun, pid) {
  const runId =
    typeof activeRun.runId === 'string' && activeRun.runId
      ? activeRun.runId
      : activeRun.beadId ?? 'unknown';
  const baseMessage = `Runner ${runId} (pid ${pid}) is not running when Symphony status was requested; the exit event may have been missed while the server was offline.`;
  const logPaths = [
    activeRun.stdoutPath,
    activeRun.stderrPath,
  ].filter(
    path =>
      typeof path === 'string' && path.trim()
  );

  if (logPaths.length === 0) {
    return baseMessage;
  }

  return `${baseMessage} Logs: ${logPaths.join(', ')}.`;
}
