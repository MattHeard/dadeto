import { applyRunnerOutcome } from '../symphony.js';

const REQUESTED_AT_FIELD = 'requested_at';

/** @typedef {{ readStatus: () => Promise<SymphonyStatus | null>, writeStatus?: (status: SymphonyStatus) => Promise<void> }} SymphonyStatusStore */
/** @typedef {Record<string, unknown> & { activeRun?: Record<string, unknown> }} SymphonyStatus */
/** @typedef {{ initialStatus: SymphonyStatus, statusStore: SymphonyStatusStore, repoRoot?: string, launchSelectedRunnerLoop?: (input: Record<string, unknown>) => Promise<unknown>, configLoader?: unknown, workflowLoader?: unknown, trackerFactory?: unknown, now?: () => number }} SymphonyOptions */
/** @typedef {{ json: (value: unknown) => unknown, status: (code: number) => SymphonyResponse }} SymphonyResponse */
/** @typedef {{ get: (...args: unknown[]) => unknown, post: (...args: unknown[]) => unknown, use: (...args: unknown[]) => unknown }} SymphonyApp */

/**
 * Wrap an async route operation with Express error forwarding.
 * @param {(res: SymphonyResponse) => Promise<void>} operation Route operation.
 * @returns {(...args: unknown[]) => unknown} Express route handler.
 */
function createAsyncRouteHandler(operation) {
  /**
   * @param {unknown} _req Request.
   * @param {SymphonyResponse} res Response.
   * @param {(error?: unknown) => void} next Error callback.
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
 * @returns {(...args: unknown[]) => unknown} Status route factory.
 */
function createSymphonyStatusHandlerFactory(deps) {
  /**
 * @param {SymphonyOptions} options Route options.
   * @returns {(...args: unknown[]) => unknown} Express route handler.
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
 * @param {SymphonyOptions} options Route options.
 * @returns {(...args: unknown[]) => unknown} Express route handler.
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
 * @param {{ refreshSymphonyStatus: (...args: unknown[]) => unknown }} deps Runtime dependencies.
 * @returns {(...args: unknown[]) => unknown} Refresh route factory.
 */
function createSymphonyRefreshHandlerFactory(deps) {
  /**
 * @param {SymphonyOptions} options Route options.
   * @returns {(...args: unknown[]) => unknown} Express route handler.
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
 * @param {((error?: unknown) => void) | undefined} next Express next callback.
 * @returns {string} Argument type marker.
 */
function getErrorMiddlewareNextType(next) {
  return typeof next;
}

/**
 * Create the local Symphony express app factory.
 * @param {{ express: (...args: unknown[]) => unknown }} deps Runtime dependencies.
 * @param {unknown} routeFactories Route factories.
 * @returns {(...args: unknown[]) => unknown} App factory.
 */
function createSymphonyAppFactory(deps, routeFactories) {
  /**
   * @param {SymphonyOptions} options App options.
   * @returns {SymphonyApp} Express app.
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

    /** @type {(error: unknown, _req: unknown, res: unknown, next: (error?: unknown) => void) => void} */
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
 * @param {SymphonyStatus} status Current status.
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
 * @param {SymphonyStatusStore} statusStore Status store.
 * @returns {boolean} True when writes are supported.
 */
function hasWritableStatusStore(statusStore) {
  return typeof statusStore.writeStatus === 'function';
}

/**
 * Read the active run process id.
 * @param {Record<string, unknown>} activeRun Active run state.
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
 * @param {Record<string, unknown>} source Source object.
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
 * @param {SymphonyStatus} status Current status.
 * @param {string} beadId Bead id.
 * @param {number} pid Process id.
 * @returns {unknown} Runner outcome.
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
 * @param {SymphonyStatus} status Current status.
 * @param {SymphonyStatusStore} statusStore Status store.
 * @param {{ isProcessAlive: (pid: number) => boolean }} deps Runtime dependencies.
 * @returns {Promise<unknown>} Reconciled status.
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
 * @param {SymphonyStatus} status Current status.
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
 * @param {Record<string, unknown>} activeRun Active run state.
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
 * @param {Record<string, unknown>} activeRun Active run state.
 * @param {number} pid Process id.
 * @returns {string} Human-readable summary.
 */
function buildOrphanedRunSummary(activeRun, pid) {
  const runId = getOrphanedRunId(activeRun);
  const baseMessage = `Runner ${runId} (pid ${pid}) is not running when Symphony status was requested; the exit event may have been missed while the server was offline.`;
  const logPaths = [activeRun.stdoutPath, activeRun.stderrPath].filter(
    /**
     * @param {unknown} path Candidate path.
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
 * @param {Record<string, unknown>} activeRun Active run state.
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
 *     get: (...args: unknown[]) => unknown,
 *     post: (...args: unknown[]) => unknown,
 *     use: (...args: unknown[]) => unknown,
 *   },
 *   refreshSymphonyStatus: (...args: unknown[]) => unknown,
 *   isProcessAlive: (pid: number) => boolean,
 * }} deps Runtime dependencies.
 * @returns {{
 *   createSymphonyStatusHandler: (...args: unknown[]) => unknown,
 *   createSymphonyLaunchHandler: (...args: unknown[]) => unknown,
 *   createSymphonyRefreshHandler: (...args: unknown[]) => unknown,
 *   createSymphonyApp: (...args: unknown[]) => unknown,
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
