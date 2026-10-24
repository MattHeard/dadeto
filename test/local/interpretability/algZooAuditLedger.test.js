import { createHash } from 'node:crypto';
import { describe, expect, it } from '@jest/globals';
import { createAlgZooAuditLedgerCore } from '../../../src/core/local/interpretability/algZooAuditLedger.js';

const ledgerPath = '/private/algzoo/run.jsonl';

/**
 * @param {Record<string, any>} [overrides] Injected failing file effects.
 * @returns {Record<string, any>} In-memory file effects and ledger.
 */
function createLedgerHarness(overrides = {}) {
  const files = new Map();
  const mkdirCalls = [];
  const ledger = createAlgZooAuditLedgerCore({
    ledgerPath,
    pathModule: { dirname: value => value.slice(0, value.lastIndexOf('/')) },
    mkdirImpl: async (...args) => mkdirCalls.push(args),
    readFileImpl: async (file, encoding) => {
      if (!files.has(file)) {
        const error = new Error('missing');
        error.code = 'ENOENT';
        throw error;
      }
      expect(encoding).toBe('utf8');
      return files.get(file);
    },
    appendFileImpl: async (file, contents, options) => {
      expect(options).toEqual({ encoding: 'utf8', mode: 0o600 });
      files.set(file, `${files.get(file) ?? ''}${contents}`);
    },
    sha256Impl: value => createHash('sha256').update(value).digest('hex'),
    ...overrides,
  });
  return { files, ledger, mkdirCalls };
}

describe('AlgZoo audit ledger', () => {
  it('writes ordered lifecycle records and verifies their hash chain', async () => {
    const { files, ledger, mkdirCalls } = createLedgerHarness();
    const first = await ledger.append('session-started', {
      arm: 'treatment',
      sessionId: 'session-1',
    });
    const second = await ledger.append('session-finished', {
      cost: { investigatorTokens: 12, toolCalls: 1 },
      findings: ['bounded', 'synthetic'],
      status: 'submitted',
    });

    expect(first).toMatchObject({ sequence: 1, previousHash: '0'.repeat(64) });
    expect(second).toMatchObject({ sequence: 2, previousHash: first.hash });
    expect(await ledger.readAll()).toEqual([first, second]);
    expect(mkdirCalls).toEqual([
      ['/private/algzoo', { recursive: true, mode: 0o700 }],
      ['/private/algzoo', { recursive: true, mode: 0o700 }],
    ]);
    expect(files.get(ledgerPath).split('\n')).toHaveLength(3);
  });

  it('serializes concurrent appends into sequence order', async () => {
    const { ledger } = createLedgerHarness();
    await Promise.all([
      ledger.append('session-started', { sessionId: 'a' }),
      ledger.append('session-started', { sessionId: 'b' }),
    ]);

    expect((await ledger.readAll()).map(record => record.sequence)).toEqual([
      1, 2,
    ]);
  });

  it('recognizes starts without a terminal lifecycle event', async () => {
    const { ledger } = createLedgerHarness();
    const terminalEvents = [
      'session-finished',
      'run-failed',
      'budget-stopped',
      'run-interrupted',
    ];
    for (const [index, eventType] of terminalEvents.entries()) {
      const sessionId = `completed-${index}`;
      await ledger.append('session-started', { sessionId });
      await ledger.append(eventType, { sessionId });
    }
    await ledger.append('session-started', { sessionId: 'interrupted' });

    await expect(ledger.readInterruptedSessions()).resolves.toMatchObject([
      {
        eventType: 'session-started',
        payload: { sessionId: 'interrupted' },
      },
    ]);
  });

  it('rejects tampered history before appending another record', async () => {
    const { files, ledger } = createLedgerHarness();
    await ledger.append('session-started', { sessionId: 'session-1' });
    files.set(
      ledgerPath,
      files.get(ledgerPath).replace('session-1', 'changed')
    );

    await expect(
      ledger.append('session-finished', { status: 'failed' })
    ).rejects.toThrow('Audit ledger hash chain is invalid at record 1.');
  });

  it('rejects held-out fields, unsupported events, and malformed ledger lines', async () => {
    const { files, ledger } = createLedgerHarness();

    await expect(
      ledger.append('session-finished', {
        result: [{ nested: { heldOutAnswer: 'secret' } }],
      })
    ).rejects.toThrow(
      'Audit payload must be a record without held-out fields.'
    );
    await expect(ledger.append('score-created', {})).rejects.toThrow(
      'Audit event type is not supported.'
    );
    files.set(ledgerPath, '{broken json}\n');
    await expect(ledger.readAll()).rejects.toThrow(
      'Audit ledger contains malformed JSON.'
    );
  });

  it('rejects missing dependencies and invalid event payloads', async () => {
    const base = {
      ledgerPath,
      pathModule: { dirname: () => '/private/algzoo' },
      mkdirImpl: async () => {},
      readFileImpl: async () => '',
      appendFileImpl: async () => {},
      sha256Impl: value => createHash('sha256').update(value).digest('hex'),
    };
    for (const key of [
      'ledgerPath',
      'pathModule',
      'mkdirImpl',
      'readFileImpl',
      'appendFileImpl',
      'sha256Impl',
    ]) {
      expect(() =>
        createAlgZooAuditLedgerCore({ ...base, [key]: undefined })
      ).toThrow(TypeError);
    }
    expect(() =>
      createAlgZooAuditLedgerCore({ ...base, ledgerPath: '  ' })
    ).toThrow(TypeError);

    const { ledger } = createLedgerHarness();
    await expect(ledger.append('session-started', null)).rejects.toThrow(
      'Audit payload must be a record without held-out fields.'
    );
    await expect(
      ledger.append('session-started', { value: undefined })
    ).rejects.toThrow('Audit payload contains a non-JSON value.');
  });

  it('rejects invalid existing JSONL lines and non-missing filesystem errors', async () => {
    const { files, ledger } = createLedgerHarness();
    files.set(ledgerPath, 'null\n');
    await expect(ledger.readAll()).rejects.toThrow(
      'Audit ledger contains malformed JSON.'
    );
    files.set(ledgerPath, '\n');
    await expect(ledger.readAll()).rejects.toThrow(
      'Audit ledger contains an empty record.'
    );

    const readError = new Error('permission denied');
    const failingLedger = createLedgerHarness({
      readFileImpl: async () => {
        throw readError;
      },
    }).ledger;
    await expect(failingLedger.readAll()).rejects.toBe(readError);
  });

  it('reads valid records without a terminal newline', async () => {
    const { files, ledger } = createLedgerHarness();
    const record = await ledger.append('run-failed', { status: 'failed' });
    files.set(ledgerPath, files.get(ledgerPath).trimEnd());

    expect(await ledger.readAll()).toEqual([record]);
  });
});
