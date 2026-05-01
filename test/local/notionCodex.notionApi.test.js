import {
  appendNotionCodexReply,
  buildReplyRichText,
  resolveNotionApiToken,
} from '../../src/local/notion-codex/notionApi.js';

describe('local notion codex api helper', () => {
  test('builds comment rich text with a handled marker', () => {
    expect(
      buildReplyRichText({
        runId: 'run-123',
        message: 'hello world',
      })
    ).toEqual([
      {
        type: 'text',
        text: { content: 'Codex reply run-123\n\nhello world' },
      },
    ]);
  });

  test('resolves the first configured Notion token environment variable', () => {
    expect(
      resolveNotionApiToken({
        env: {
          NOTION_API_KEY: '',
          NOTION_TOKEN: ' secret ',
        },
        tokenEnvNames: ['NOTION_API_KEY', 'NOTION_TOKEN'],
      })
    ).toEqual({
      envName: 'NOTION_TOKEN',
      token: 'secret',
    });
  });

  test('creates a page-level Notion comment', async () => {
    const calls = [];
    const result = await appendNotionCodexReply({
      pageId: 'page 123',
      runId: 'run-123',
      message: 'hello',
      token: 'token-123',
      notionVersion: '2025-09-03',
      async fetchImpl(url, init) {
        calls.push({ url, init });
        return {
          ok: true,
          async text() {
            return JSON.stringify({ id: 'comment-1' });
          },
        };
      },
    });

    expect(result).toEqual({ id: 'comment-1' });
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe('https://api.notion.com/v1/comments');
    expect(calls[0].init.method).toBe('POST');
    expect(calls[0].init.headers).toMatchObject({
      Authorization: 'Bearer token-123',
      'Content-Type': 'application/json',
      'Notion-Version': '2025-09-03',
    });
    expect(JSON.parse(calls[0].init.body)).toEqual({
      parent: { page_id: 'page 123' },
      rich_text: [
        {
          type: 'text',
          text: { content: 'Codex reply run-123\n\nhello' },
        },
      ],
    });
  });

  test('surfaces Notion API error details', async () => {
    await expect(
      appendNotionCodexReply({
        pageId: 'page-123',
        runId: 'run-123',
        message: 'hello',
        token: 'token-123',
        async fetchImpl() {
          return {
            ok: false,
            status: 403,
            async text() {
              return JSON.stringify({
                code: 'restricted_resource',
                message: 'Integration lacks access',
              });
            },
          };
        },
      })
    ).rejects.toThrow(
      'HTTP 403: restricted_resource - Integration lacks access'
    );
  });
});
