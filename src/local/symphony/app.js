import express from 'express';

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
      res.json(storedStatus ?? options.initialStatus);
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
