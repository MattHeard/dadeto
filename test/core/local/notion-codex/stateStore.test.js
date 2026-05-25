import { jest } from '@jest/globals';
import {
  createNotionCodexStateStore,
  normalizeNotionCodexState,
} from '../../../../src/core/local/notion-codex/stateStore.js';

describe('notion codex state store core', () => {
  test('normalizes defaults and writes normalized state', async () => {
    const mkdirImpl = jest.fn(async () => {});
    const writeFileImpl = jest.fn(async () => {});
    const store = createNotionCodexStateStore({
      statePath: '/tmp/state.json',
      readFileImpl: jest.fn(async () => '{}'),
      mkdirImpl,
      writeFileImpl,
    });

    await store.writeState({ eventLog: Array.from({ length: 30 }, (_, i) => i) });

    expect(mkdirImpl).toHaveBeenCalled();
    expect(writeFileImpl).toHaveBeenCalledWith(
      '/tmp/state.json',
      expect.stringContaining('"eventLog"'),
      'utf8'
    );
    expect(normalizeNotionCodexState(null).lastOutcome).toBe('idle');
  });

  test('normalizes invalid activeRun to null and trims event log', () => {
    const normalized = normalizeNotionCodexState({
      activeRun: 7,
      eventLog: Array.from({ length: 25 }, (_, i) => ({ i })),
    });
    expect(normalized.activeRun).toBeNull();
    expect(normalized.eventLog).toHaveLength(20);
  });

  test('reads ENOENT as empty state and rethrows other errors', async () => {
    const notFound = Object.assign(new Error('missing'), { code: 'ENOENT' });
    const store = createNotionCodexStateStore({
      statePath: '/tmp/state.json',
      readFileImpl: jest.fn(async () => { throw notFound; }),
    });
    await expect(store.readState()).resolves.toEqual(
      expect.objectContaining({ lastOutcome: 'idle' })
    );

    const fatal = new Error('fatal');
    const badStore = createNotionCodexStateStore({
      statePath: '/tmp/state.json',
      readFileImpl: jest.fn(async () => { throw fatal; }),
    });
    await expect(badStore.readState()).rejects.toThrow('fatal');
  });
});
