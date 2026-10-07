import { jest } from '@jest/globals';
import { bindEffectBoundary } from '../../src/local/allow-effects.js';
import { createSymphonyStatusStore } from '../../src/local/symphony/statusStore.js';

describe('Symphony status store effects', () => {
  test('forwards one explicit permission to directory creation and writes', async () => {
    const mkdirImpl = jest.fn().mockResolvedValue(undefined);
    const writeFileImpl = jest.fn().mockResolvedValue(undefined);
    const statusPath = '/repo/tracking/symphony/status.json';

    await bindEffectBoundary(async permission => {
      const store = createSymphonyStatusStore({
        statusPath,
        logDir: '/repo/tracking/symphony',
        mkdirImpl,
        writeFileImpl,
      });

      await store.writeStatus(permission, {
        startedAt: '2026-10-08T12:00:00.000Z',
        state: 'idle',
      });

      expect(mkdirImpl.mock.calls.map(([token]) => token)).toEqual([
        permission,
        permission,
      ]);
      expect(writeFileImpl.mock.calls.map(([token]) => token)).toEqual([
        permission,
        permission,
      ]);
      expect(writeFileImpl.mock.calls.map(([, filePath]) => filePath)).toEqual([
        statusPath,
        '/repo/tracking/symphony/runs/2026-10-08T12-00-00.000Z--startup.log',
      ]);
    });
  });
});
