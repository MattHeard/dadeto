import { buildNotionCodexPrompt } from '../../../../src/core/local/notion-codex/prompt.js';

describe('notion codex prompt core', () => {
  test('uses default token env names when none configured', () => {
    const text = buildNotionCodexPrompt({
      config: {
        notion: {
          dadetoPageId: 'a',
          dadetoPageUrl: 'u1',
          symphonyPageId: 'b',
          symphonyPageUrl: 'u2',
          taskDataSourceUrl: 'u3',
          taskContext: '',
          taskStatus: '',
          messageSearchQuery: '',
          inboxPageIds: [],
        },
      },
      repoRoot: '/repo',
      runId: 'run:id',
      nowIso: '2026-01-01T00:00:00.000Z',
    });

    expect(text).toContain('NOTION_API_KEY or NOTION_TOKEN');
  });

  test('lists configured inbox pages and token environment names', () => {
    const text = buildNotionCodexPrompt({
      config: {
        notion: {
          dadetoPageId: 'a',
          dadetoPageUrl: 'u1',
          symphonyPageId: 'b',
          symphonyPageUrl: 'u2',
          taskDataSourceUrl: 'u3',
          taskContext: '',
          taskStatus: '',
          messageSearchQuery: '',
          inboxPageIds: ['inbox-a', 'inbox-b'],
          apiTokenEnvNames: ['TOKEN_A', 'TOKEN_B'],
        },
      },
      repoRoot: '/repo',
      runId: 'run:id',
      nowIso: '2026-01-01T00:00:00.000Z',
    });

    expect(text).toContain('- inbox-a\n- inbox-b');
    expect(text).toContain('TOKEN_A or TOKEN_B');
  });
});
