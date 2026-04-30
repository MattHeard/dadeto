import {
  appendNotionCodexReply,
  buildReplyBlocks,
  resolveNotionApiToken,
} from '../../src/local/notion-codex/notionApi.js';

describe('local notion codex api helper', () => {
  test('builds append-only reply blocks with a handled marker', () => {
    expect(
      buildReplyBlocks({
        runId: 'run-123',
        message: 'hello world',
      })
    ).toEqual([
      { object: 'block', type: 'divider', divider: {} },
      {
        object: 'block',
        type: 'heading_3',
        heading_3: {
          rich_text: [
            {
              type: 'text',
              text: { content: 'Codex reply run-123' },
            },
          ],
        },
      },
      {
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [
            {
              type: 'text',
              text: { content: 'hello world' },
            },
          ],
        },
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

  test('appends reply blocks to the Notion block children endpoint', async () => {
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
            return JSON.stringify({ results: [{ id: 'block-1' }] });
          },
        };
      },
    });

    expect(result).toEqual({ results: [{ id: 'block-1' }] });
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe(
      'https://api.notion.com/v1/blocks/page%20123/children'
    );
    expect(calls[0].init.method).toBe('PATCH');
    expect(calls[0].init.headers).toMatchObject({
      Authorization: 'Bearer token-123',
      'Content-Type': 'application/json',
      'Notion-Version': '2025-09-03',
    });
    expect(JSON.parse(calls[0].init.body)).toMatchObject({
      position: { type: 'end' },
      children: [
        { type: 'divider' },
        { type: 'heading_3' },
        { type: 'paragraph' },
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
