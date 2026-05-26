import { jest } from '@jest/globals';
import {
  createNotionCodexStateStore,
  normalizeActiveRun,
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

    await store.writeState({
      eventLog: Array.from({ length: 30 }, (_, i) => i),
    });

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

  test('exports normalizeActiveRun for direct branch testing', () => {
    expect(normalizeActiveRun(null)).toBeNull();
    expect(normalizeActiveRun(9)).toBeNull();
    const run = { id: 'run-2' };
    expect(normalizeActiveRun(run)).toBe(run);
  });

  test('preserves valid scalar fields during normalization', () => {
    const normalized = normalizeNotionCodexState({
      lastPollAt: '2026-05-26T00:00:00.000Z',
      lastOutcome: 'success',
      lastSummary: 'ok',
      idleBackoffExponent: 4,
      nextPollAfter: '2026-05-26T00:05:00.000Z',
      activeRun: { id: 'run-3' },
      eventLog: [{ step: 1 }],
    });

    expect(normalized).toEqual(
      expect.objectContaining({
        lastPollAt: '2026-05-26T00:00:00.000Z',
        lastOutcome: 'success',
        lastSummary: 'ok',
        idleBackoffExponent: 4,
        nextPollAfter: '2026-05-26T00:05:00.000Z',
        activeRun: { id: 'run-3' },
        eventLog: [{ step: 1 }],
      })
    );
  });

  test('keeps object activeRun values and normalizes parsed read state', async () => {
    const store = createNotionCodexStateStore({
      statePath: '/tmp/state.json',
      readFileImpl: jest.fn(async () =>
        JSON.stringify({
          activeRun: { id: 'run-1' },
          eventLog: [{ ok: true }],
        })
      ),
    });

    await expect(store.readState()).resolves.toEqual(
      expect.objectContaining({
        activeRun: { id: 'run-1' },
        eventLog: [{ ok: true }],
      })
    );
  });

  test('normalizes optional scalar fields when types are invalid', () => {
    const normalized = normalizeNotionCodexState({
      lastPollAt: 123,
      lastOutcome: null,
      lastSummary: false,
      idleBackoffExponent: 1.5,
      nextPollAfter: {},
      eventLog: 'bad',
    });

    expect(normalized).toEqual(
      expect.objectContaining({
        lastPollAt: null,
        lastOutcome: 'idle',
        lastSummary: '',
        idleBackoffExponent: null,
        nextPollAfter: null,
        eventLog: [],
      })
    );
  });

  test('uses node fs defaults when dependency implementations are omitted', () => {
    const store = createNotionCodexStateStore({ statePath: '/tmp/state.json' });
    expect(typeof store.readState).toBe('function');
    expect(typeof store.writeState).toBe('function');
  });

  test('reads ENOENT as empty state and rethrows other errors', async () => {
    const notFound = Object.assign(new Error('missing'), { code: 'ENOENT' });
    const store = createNotionCodexStateStore({
      statePath: '/tmp/state.json',
      readFileImpl: jest.fn(async () => {
        throw notFound;
      }),
    });
    await expect(store.readState()).resolves.toEqual(
      expect.objectContaining({ lastOutcome: 'idle' })
    );

    const fatal = new Error('fatal');
    const badStore = createNotionCodexStateStore({
      statePath: '/tmp/state.json',
      readFileImpl: jest.fn(async () => {
        throw fatal;
      }),
    });
    await expect(badStore.readState()).rejects.toThrow('fatal');
  });

  test('rethrows non-object read errors without treating them as missing state', async () => {
    const store = createNotionCodexStateStore({
      statePath: '/tmp/state.json',
      readFileImpl: jest.fn(async () => {
        throw null;
      }),
    });

    await expect(store.readState()).rejects.toBeNull();
  });

  test('rethrows read errors when the code is not a string', async () => {
    const store = createNotionCodexStateStore({
      statePath: '/tmp/state.json',
      readFileImpl: jest.fn(async () => {
        throw { code: 123 };
      }),
    });

    await expect(store.readState()).rejects.toEqual({ code: 123 });
  });

  test('normalizes non-object state input to defaults', () => {
    const normalized = normalizeNotionCodexState('invalid');

    expect(normalized).toEqual(
      expect.objectContaining({
        lastPollAt: null,
        lastOutcome: 'idle',
        lastSummary: '',
        idleBackoffExponent: null,
        nextPollAfter: null,
        eventLog: [],
        activeRun: null,
      })
    );
  });
});
