import {
  createNotionCodexOutcomeStore,
  normalizeNotionCodexOutcome,
} from '../../../src/core/local/notion-codex/outcomeStore.js';
import path from 'node:path';

describe('core local notion codex outcome store', () => {
  test('captures file operations but keeps path dependencies live across calls', async () => {
    const events = [];
    const options = {
      outcomeDir: '/tmp/first',
      pathModule: path,
      async mkdirImpl(directory) {
        events.push(['mkdir', directory]);
        options.outcomeDir = '/tmp/after-mkdir';
      },
      async readFileImpl(filename) {
        events.push(['read', filename]);
        return '{}';
      },
      async writeFileImpl(filename, contents) {
        events.push(['write', filename, contents]);
      },
    };
    const store = createNotionCodexOutcomeStore(options);
    const replacement = async () => {
      throw new Error('replacement must not be used');
    };
    options.mkdirImpl = replacement;
    options.readFileImpl = replacement;
    options.writeFileImpl = replacement;
    options.outcomeDir = '/tmp/current';
    const first = await store.readOutcome('run:one');
    first.summary = 'changed';
    await expect(store.readOutcome('run:one')).resolves.toEqual({
      outcome: 'unknown',
      summary: '',
    });
    await store.writeOutcome('run:two', { summary: 'saved' });
    expect(events).toEqual([
      ['read', '/tmp/current/run-one.json'],
      ['read', '/tmp/current/run-one.json'],
      ['mkdir', '/tmp/current'],
      [
        'write',
        '/tmp/after-mkdir/run-two.json',
        JSON.stringify({ outcome: 'unknown', summary: 'saved' }, null, 2),
      ],
    ]);
  });

  test('normalizes missing fields from non-object input', () => {
    expect(normalizeNotionCodexOutcome(null)).toEqual({
      outcome: 'unknown',
      summary: '',
    });
  });

  test('reads a missing outcome as null', async () => {
    const store = createNotionCodexOutcomeStore({
      outcomeDir: '/tmp/outcomes',
      pathModule: path,
      async readFileImpl() {
        const error = new Error('missing');
        error.code = 'ENOENT';
        throw error;
      },
    });

    await expect(store.readOutcome('run-123')).resolves.toBeNull();
  });

  test('reads a stored outcome file', async () => {
    const store = createNotionCodexOutcomeStore({
      outcomeDir: '/tmp/outcomes',
      pathModule: path,
      async readFileImpl(pathValue, encoding) {
        expect(pathValue).toBe('/tmp/outcomes/run-123.json');
        expect(encoding).toBe('utf8');
        return JSON.stringify({ outcome: 'handled', summary: 'Done.' });
      },
    });

    await expect(store.readOutcome('run-123')).resolves.toEqual({
      outcome: 'handled',
      summary: 'Done.',
    });
  });

  test('rethrows unexpected read errors', async () => {
    const failure = new Error('boom');
    const store = createNotionCodexOutcomeStore({
      outcomeDir: '/tmp/outcomes',
      pathModule: path,
      async readFileImpl() {
        throw failure;
      },
    });

    await expect(store.readOutcome('run-123')).rejects.toBe(failure);
  });

  test('writes normalized outcome files with sanitized run ids', async () => {
    const writes = [];
    const store = createNotionCodexOutcomeStore({
      outcomeDir: '/tmp/outcomes',
      pathModule: path,
      async mkdirImpl(pathValue, options) {
        writes.push({ type: 'mkdir', pathValue, options });
      },
      async writeFileImpl(pathValue, content, encoding) {
        writes.push({ type: 'writeFile', pathValue, content, encoding });
      },
    });

    await store.writeOutcome('2026-04-30T07:48:00.000Z--notion-codex', {
      outcome: 'idle',
      summary: 'No task found.',
    });

    expect(writes).toEqual([
      {
        type: 'mkdir',
        pathValue: '/tmp/outcomes',
        options: { recursive: true },
      },
      {
        type: 'writeFile',
        pathValue: '/tmp/outcomes/2026-04-30T07-48-00.000Z--notion-codex.json',
        content: JSON.stringify(
          {
            outcome: 'idle',
            summary: 'No task found.',
          },
          null,
          2
        ),
        encoding: 'utf8',
      },
    ]);
  });
});
