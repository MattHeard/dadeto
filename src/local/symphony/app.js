import express from 'express';

/**
 * @param {{
 *   initialStatus: Record<string, unknown>,
 *   statusStore: { readStatus: () => Promise<Record<string, unknown> | null> }
 * }} options
 * @returns {import('express').Express} Express app for the local Symphony status shell.
 */
export function createSymphonyApp(options) {
  const app = express();

  const sendStatus = async (_req, res, next) => {
    try {
      const storedStatus = await options.statusStore.readStatus();
      res.json(storedStatus ?? options.initialStatus);
    } catch (error) {
      next(error);
    }
  };

  app.get('/api/symphony/status', sendStatus);
  app.get('/', sendStatus);

  app.use((error, _req, res, _next) => {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown server error',
    });
  });

  return app;
}
