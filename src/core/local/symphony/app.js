import { applyRunnerOutcome } from '../symphony.js';

/**
 *
 * @param deps
 */
function createSymphonyStatusHandlerFactory(deps) {
  return function createSymphonyStatusHandler(options) {
    return async (_req, res, next) => {
      try {
        const storedStatus = await options.statusStore.readStatus();
        const baseStatus = storedStatus ?? options.initialStatus;
        const reconciledStatus = await reconcileOrphanedRun(
          baseStatus,
          options.statusStore,
          deps
        );
        res.json(reconciledStatus);
      } catch (error) {
        next(error);
      }
    };
  };
}

/**
 *
 * @param options
 */
function createSymphonyLaunchHandler(options) {
  return async (_req, res, next) => {
    try {
      const launchImpl = options.launchSelectedRunnerLoop;
      if (
        !launchImpl ||
        typeof options.statusStore.writeStatus !== 'function'
      ) {
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
 *
 * @param deps
 */
function createSymphonyRefreshHandlerFactory(deps) {
  return function createSymphonyRefreshHandler(options) {
    return async (_req, res, next) => {
      try {
        if (
          !options.statusStore ||
          typeof options.statusStore.writeStatus !== 'function'
        ) {
          res.status(501).json({
            error: 'Symphony refresh trigger is not configured.',
          });
          return;
        }

        const snapshot = await deps.refreshSymphonyStatus({
          repoRoot: options.repoRoot,
          configLoader: options.configLoader,
          workflowLoader: options.workflowLoader,
          trackerFactory: options.trackerFactory,
          now: options.now,
          statusStore: options.statusStore,
        });

        res.status(202).json({
          queued: true,
          coalesced: false,
          requested_at: snapshot.status.startedAt,
          operations: ['poll', 'reconcile'],
        });
      } catch (error) {
        next(error);
      }
    };
  };
}

/**
 *
 * @param deps
 * @param routeFactories
 */
function createSymphonyAppFactory(deps, routeFactories) {
  return function createSymphonyApp(options) {
    const app = deps.express();
    const sendStatus = routeFactories.createSymphonyStatusHandler(options);
    const launchSelectedBead =
      routeFactories.createSymphonyLaunchHandler(options);
    const refreshQueue = routeFactories.createSymphonyRefreshHandler(options);

    app.get('/api/symphony/status', sendStatus);
    app.get('/', sendStatus);
    app.post('/api/symphony/launch', launchSelectedBead);
    app.post('/api/v1/refresh', refreshQueue);

    app.use((error, _req, res, _next) => {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Unknown server error',
      });
    });

    return app;
  };
}

/**
 *
 * @param status
 * @param statusStore
 * @param deps
 */
async function reconcileOrphanedRun(status, statusStore, deps) {
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

  if (deps.isProcessAlive(pid)) {
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

  const updatedStatus = {
    ...applyRunnerOutcome(status, outcome),
    operatorTrustReason: buildOrphanedRunTrustReason(status.activeRun, pid),
  };
  await statusStore.writeStatus(updatedStatus);
  return updatedStatus;
}

/**
 *
 * @param status
 */
function getActiveRunBeadId(status) {
  if (typeof status.activeRun.beadId === 'string' && status.activeRun.beadId) {
    return status.activeRun.beadId;
  }

  if (typeof status.currentBeadId === 'string' && status.currentBeadId) {
    return status.currentBeadId;
  }

  return null;
}

/**
 *
 * @param activeRun
 * @param pid
 */
function buildOrphanedRunSummary(activeRun, pid) {
  const runId =
    typeof activeRun.runId === 'string' && activeRun.runId
      ? activeRun.runId
      : (activeRun.beadId ?? 'unknown');
  const baseMessage = `Runner ${runId} (pid ${pid}) is not running when Symphony status was requested; the exit event may have been missed while the server was offline.`;
  const logPaths = [activeRun.stdoutPath, activeRun.stderrPath].filter(
    path => typeof path === 'string' && path.trim()
  );

  if (logPaths.length === 0) {
    return baseMessage;
  }

  return `${baseMessage} Logs: ${logPaths.join(', ')}.`;
}

/**
 *
 * @param activeRun
 * @param pid
 */
function buildOrphanedRunTrustReason(activeRun, pid) {
  const runId =
    typeof activeRun.runId === 'string' && activeRun.runId
      ? activeRun.runId
      : (activeRun.beadId ?? 'unknown');

  return `Symphony marked run ${runId} as blocked because pid ${pid} was no longer alive when status was requested.`;
}

/**
 * Build the local Symphony app adapter handle.
 * @param {{
 *   express: () => {
 *     get: Function,
 *     post: Function,
 *     use: Function,
 *   },
 *   refreshSymphonyStatus: Function,
 *   isProcessAlive: (pid: number) => boolean,
 * }} deps Runtime dependencies.
 * @returns {{
 *   createSymphonyStatusHandler: Function,
 *   createSymphonyLaunchHandler: Function,
 *   createSymphonyRefreshHandler: Function,
 *   createSymphonyApp: Function,
 * }} Symphony app handle.
 */
export function createSymphonyAppHandle(deps) {
  const routeFactories = {
    createSymphonyStatusHandler: createSymphonyStatusHandlerFactory(deps),
    createSymphonyLaunchHandler,
    createSymphonyRefreshHandler: createSymphonyRefreshHandlerFactory(deps),
  };

  return {
    ...routeFactories,
    createSymphonyApp: createSymphonyAppFactory(deps, routeFactories),
  };
}
