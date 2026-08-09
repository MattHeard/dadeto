import { jest } from '@jest/globals';
import { runReportForModeration } from '../../../../src/core/cloud/report-for-moderation/run.js';

test('wires the report-for-moderation cloud entrypoint', async () => {
  const add = jest.fn().mockResolvedValue(undefined);
  const query = {
    where: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    get: jest.fn().mockResolvedValue({ empty: true }),
  };
  const collection = jest.fn(() => ({ add, where: () => query }));
  const db = { collection };
  const app = { use: jest.fn(), all: jest.fn() };
  const cors = jest.fn(() => 'cors-middleware');
  const onRequest = jest.fn(handler => ({ handler }));
  const deps = {
    createFirebaseAppManager: jest.fn(() => ({ ensureFirebaseApp: jest.fn() })),
    initializeApp: jest.fn(),
    getFirestoreInstance: jest.fn(() => db),
    getEnvironmentVariables: jest.fn(() => ({
      DENDRITE_ENVIRONMENT: 't-test',
    })),
    FieldValue: { serverTimestamp: jest.fn(() => 'timestamp') },
    express: Object.assign(
      jest.fn(() => app),
      { json: jest.fn(() => 'json-middleware') }
    ),
    cors,
    functions: { region: jest.fn(() => ({ https: { onRequest } })) },
  };

  const wired = runReportForModeration(deps);

  expect(wired.handle).toEqual({ handler: app });
  expect(wired.handleReportForModeration).toEqual(expect.any(Function));
  expect(deps.createFirebaseAppManager).toHaveBeenCalledWith(
    deps.initializeApp
  );
  expect(app.use).toHaveBeenCalledTimes(2);
  expect(app.all).toHaveBeenCalledWith('/', wired.handleReportForModeration);
  expect(cors).toHaveBeenCalledWith(
    expect.objectContaining({ methods: ['POST'] })
  );

  const response = await wired.handleReportForModeration(
    { method: 'POST', body: { variant: 'v', reporterIdentity: 'r' } },
    { status: jest.fn().mockReturnThis(), json: jest.fn(), send: jest.fn() }
  );
  expect(response).toBeUndefined();
  expect(add).toHaveBeenCalledWith({
    variant: 'v',
    reporterIdentity: 'r',
    createdAt: 'timestamp',
  });
});
