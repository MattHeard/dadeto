import { createNotionCodexOutcomeStore } from '../../src/local/notion-codex/outcomeStore.js';

describe('local notion codex outcome store', () => {
  test('reads a missing outcome as null', async () => {
    const store = createNotionCodexOutcomeStore({
      outcomeDir: '/tmp/outcomes',
      async readFileImpl() {
        const error = new Error('missing');
        error.code = 'ENOENT';
        throw error;
      },
    });

    await expect(store.readOutcome('run-123')).resolves.toBeNull();
  });

  test('writes normalized outcome files with sanitized run ids', async () => {
    const writes = [];
    const store = createNotionCodexOutcomeStore({
      outcomeDir: '/tmp/outcomes',
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
