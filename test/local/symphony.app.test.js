import http from 'node:http';
import { createSymphonyApp } from '../../src/local/symphony/app.js';

describe('local symphony app', () => {
  test('serves operator recommendation at both root and status endpoints', async () => {
    const app = createSymphonyApp({
      initialStatus: {
        state: 'ready',
        operatorRecommendation: 'Run the next worker loop on dadeto-82el.',
      },
      statusStore: {
        async readStatus() {
          return {
            state: 'ready',
            operatorRecommendation: 'Run the next worker loop on dadeto-82el.',
          };
        },
      },
    });

    const server = http.createServer(app);
    await new Promise(resolve => server.listen(0, resolve));
    const { port } = server.address();

    try {
      const rootResponse = await fetch(`http://127.0.0.1:${String(port)}/`);
      const statusResponse = await fetch(
        `http://127.0.0.1:${String(port)}/api/symphony/status`
      );

      expect(rootResponse.status).toBe(200);
      await expect(rootResponse.json()).resolves.toEqual({
        state: 'ready',
        operatorRecommendation: 'Run the next worker loop on dadeto-82el.',
      });

      expect(statusResponse.status).toBe(200);
      await expect(statusResponse.json()).resolves.toEqual({
        state: 'ready',
        operatorRecommendation: 'Run the next worker loop on dadeto-82el.',
      });
    } finally {
      await new Promise((resolve, reject) => {
        server.close(error => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      });
    }
  });
});
