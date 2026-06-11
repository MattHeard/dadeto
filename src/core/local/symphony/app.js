import { applyRunnerOutcome } from '../symphony.js';

const REQUESTED_AT_FIELD = 'requested_at';

/**
 * Wrap an async route operation with Express error forwarding.
 * @param {(res: any) => Promise<void>} operation Route operation.
 * @returns {Function} Express route handler.
 */
function createAsyncRouteHandler(operation) {
  /**
   * @param {any} _req Request.
   * @param {any} res Response.
   * @param {Function} next Error callback.
   * @returns {Promise<void>} Completion promise.
   */
  return async (_req, res, next) => {
    try {
      await operation(res);
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Create a Symphony status route factory.
 * @param {{ isProcessAlive: (pid: number) => boolean }} deps Runtime dependencies.
 * @returns {Function} Status route factory.
 */
function createSymphonyStatusHandlerFactory(deps) {
  /**
   * @param {any} options Route options.
   * @returns {Function} Express route handler.
   */
  return function createSymphonyStatusHandler(options) {
    return createAsyncRouteHandler(async res => {
      const storedStatus = await options.statusStore.readStatus();
      const baseStatus = storedStatus ?? options.initialStatus;
      const reconciledStatus = await reconcileOrphanedRun(
        baseStatus,
        options.statusStore,
        deps
      );
      res.json(reconciledStatus);
    });
  };
}

/**
 * Create the Symphony launch route.
 * @param {any} options Route options.
 * @returns {Function} Express route handler.
 */
function createSymphonyLaunchHandler(options) {
  return createAsyncRouteHandler(async res => {
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
  });
}

/**
 * Create a Symphony refresh route factory.
 * @param {{ refreshSymphonyStatus: Function }} deps Runtime dependencies.
 * @returns {Function} Refresh route factory.
 */
function createSymphonyRefreshHandlerFactory(deps) {
  /**
   * @param {any} options Route options.
   * @returns {Function} Express route handler.
   */
  return function createSymphonyRefreshHandler(options) {
    return createAsyncRouteHandler(async res => {
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
        [REQUESTED_AT_FIELD]: snapshot.status.startedAt,
        operations: ['poll', 'reconcile'],
      });
    });
  };
}

/**
 * Touch Express' fourth error-middleware argument without creating a branch.
 * @param {Function | undefined} next Express next callback.
 * @returns {string} Argument type marker.
 */
function getErrorMiddlewareNextType(next) {
  return typeof next;
}

/**
 * Create the local Symphony express app factory.
 * @param {{ express: Function }} deps Runtime dependencies.
 * @param {any} routeFactories Route factories.
 * @returns {Function} App factory.
 */
function createSymphonyAppFactory(deps, routeFactories) {
  /**
   * @param {any} options App options.
   * @returns {any} Express app.
   */
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

    /** @type {(error: any, _req: any, res: any, next: Function) => void} */
    const handleError = (error, _req, res, next) => {
      getErrorMiddlewareNextType(next);
      let message = 'Unknown server error';
      if (error instanceof Error) {
        message = error.message;
      }
      res.status(500).json({
        error: message,
      });
    };
    app.use(handleError);

    return app;
  };
}

/**
 * Test whether an active run can be reconciled.
 * @param {any} status Current status.
 * @returns {boolean} True when the status contains an active run object.
 */
function hasReconciliableActiveRun(status) {
  return Boolean(
    status &&
      typeof status === 'object' &&
      status.activeRun &&
      typeof status.activeRun === 'object'
  );
}

/**
 * Test whether a status store can persist updates.
 * @param {any} statusStore Status store.
 * @returns {boolean} True when writes are supported.
 */
function hasWritableStatusStore(statusStore) {
  return typeof statusStore.writeStatus === 'function';
}

/**
 * Read the active run process id.
 * @param {any} activeRun Active run state.
 * @returns {number | null} Process id, or null when unavailable.
 */
function getActiveRunPid(activeRun) {
  if (typeof activeRun.pid === 'number') {
    return activeRun.pid;
  }

  return null;
}

/**
 * Read an optional string field.
 * @param {any} source Source object.
 * @param {string} key Field name.
 * @returns {string | null} String value, or null.
 */
function getOptionalString(source, key) {
  if (typeof source[key] === 'string') {
    return source[key];
  }

  return null;
}

/**
 * Build the blocked outcome for an orphaned run.
 * @param {any} status Current status.
 * @param {string} beadId Bead id.
 * @param {number} pid Process id.
 * @returns {any} Runner outcome.
 */
function buildOrphanedRunOutcome(status, beadId, pid) {
  return {
    beadId,
    beadTitle: getOptionalString(status.activeRun, 'beadTitle'),
    outcome: 'blocked',
    summary: buildOrphanedRunSummary(status.activeRun, pid),
  };
}

/**
 * Reconcile a stored status whose active runner process has disappeared.
 * @param {any} status Current status.
 * @param {any} statusStore Status store.
 * @param {{ isProcessAlive: (pid: number) => boolean }} deps Runtime dependencies.
 * @returns {Promise<any>} Reconciled status.
 */
async function reconcileOrphanedRun(status, statusStore, deps) {
  if (!hasReconciliableActiveRun(status)) {
    return status;
  }

  if (!hasWritableStatusStore(statusStore)) {
    return status;
  }

  const pid = getActiveRunPid(status.activeRun);
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

  const outcome = buildOrphanedRunOutcome(status, beadId, pid);

  const updatedStatus = {
    ...applyRunnerOutcome(status, outcome),
    operatorTrustReason: buildOrphanedRunTrustReason(status.activeRun, pid),
  };
  await statusStore.writeStatus(updatedStatus);
  return updatedStatus;
}

/**
 * Read the bead id associated with an active run.
 * @param {any} status Current status.
 * @returns {string | null} Bead id, or null.
 */
function getActiveRunBeadId(status) {
  const activeRunBeadId = getOptionalString(status.activeRun, 'beadId');
  if (activeRunBeadId) {
    return activeRunBeadId;
  }

  const currentBeadId = getOptionalString(status, 'currentBeadId');
  if (currentBeadId) {
    return currentBeadId;
  }

  return null;
}

/**
 * Read the display id for an orphaned run.
 * @param {any} activeRun Active run state.
 * @returns {string} Run id for operator-facing messages.
 */
function getOrphanedRunId(activeRun) {
  if (typeof activeRun.runId === 'string' && activeRun.runId) {
    return activeRun.runId;
  }

  return activeRun.beadId ?? 'unknown';
}

/**
 * Build the operator summary for an orphaned run.
 * @param {any} activeRun Active run state.
 * @param {number} pid Process id.
 * @returns {string} Human-readable summary.
 */
function buildOrphanedRunSummary(activeRun, pid) {
  const runId = getOrphanedRunId(activeRun);
  const baseMessage = `Runner ${runId} (pid ${pid}) is not running when Symphony status was requested; the exit event may have been missed while the server was offline.`;
  const logPaths = [activeRun.stdoutPath, activeRun.stderrPath].filter(
    /**
     * @param {any} path Candidate path.
     * @returns {boolean | string} Truthy path when it should be included.
     */
    path => typeof path === 'string' && path.trim()
  );

  if (logPaths.length === 0) {
    return baseMessage;
  }

  return `${baseMessage} Logs: ${logPaths.join(', ')}.`;
}

/**
 * Build the operator trust reason for an orphaned run.
 * @param {any} activeRun Active run state.
 * @param {number} pid Process id.
 * @returns {string} Human-readable trust reason.
 */
function buildOrphanedRunTrustReason(activeRun, pid) {
  const runId = getOrphanedRunId(activeRun);

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
