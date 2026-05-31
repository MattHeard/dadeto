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

  test('splits long reply rich text into multiple chunks', () => {
    const result = buildReplyRichText({
      runId: 'run-123',
      message: 'x'.repeat(3600),
    });

    expect(result).toHaveLength(3);
    expect(result[0].text.content.length).toBeGreaterThan(0);
    expect(result[1].text.content.length).toBeGreaterThan(0);
    expect(result[2].text.content.length).toBeGreaterThan(0);
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

  test('resolves the default Notion token environment variable when options are omitted', () => {
    const originalValue = process.env.NOTION_API_KEY;
    process.env.NOTION_API_KEY = ' default-token ';

    try {
      expect(resolveNotionApiToken()).toEqual({
        envName: 'NOTION_API_KEY',
        token: 'default-token',
      });
    } finally {
      if (originalValue === undefined) {
        delete process.env.NOTION_API_KEY;
      } else {
        process.env.NOTION_API_KEY = originalValue;
      }
    }
  });

  test('rejects when no Notion token is available', () => {
    expect(() =>
      resolveNotionApiToken({
        env: {},
      })
    ).toThrow('Missing Notion API token.');
  });

  test('falls back to default token names when the configured list is empty', () => {
    expect(() =>
      resolveNotionApiToken({
        env: {},
        tokenEnvNames: [],
      })
    ).toThrow('Missing Notion API token.');
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

  test('rejects invalid input before calling Notion', async () => {
    await expect(
      appendNotionCodexReply({
        pageId: '',
        runId: 'run-123',
        message: 'hello',
        token: 'token-123',
        fetchImpl: {},
      })
    ).rejects.toThrow('pageId is required.');
  });

  test('rejects when fetch implementation is missing', async () => {
    await expect(
      appendNotionCodexReply({
        pageId: 'page-123',
        runId: 'run-123',
        message: 'hello',
        token: 'token-123',
        fetchImpl: {},
      })
    ).rejects.toThrow('A fetch implementation is required to call the Notion API.');
  });

  test('uses the global fetch implementation when none is provided', async () => {
    const originalFetch = globalThis.fetch;
    const calls = [];
    globalThis.fetch = async (url, init) => {
      calls.push({ url, init });
      return {
        ok: true,
        async text() {
          return JSON.stringify({ ok: true });
        },
      };
    };

    try {
      await appendNotionCodexReply({
        pageId: 'page-123',
        runId: 'run-123',
        message: 'hello',
        token: 'token-123',
      });
    } finally {
      globalThis.fetch = originalFetch;
    }

    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe('https://api.notion.com/v1/comments');
  });

  test('returns null for empty Notion responses', async () => {
    const result = await appendNotionCodexReply({
      pageId: 'page-123',
      runId: 'run-123',
      message: 'hello',
      token: 'token-123',
      async fetchImpl() {
        return {
          ok: true,
          async text() {
            return '';
          },
        };
      },
    });

    expect(result).toBeNull();
  });

  test('returns raw text for invalid JSON Notion responses', async () => {
    const result = await appendNotionCodexReply({
      pageId: 'page-123',
      runId: 'run-123',
      message: 'hello',
      token: 'token-123',
      async fetchImpl() {
        return {
          ok: true,
          async text() {
            return 'not-json';
          },
        };
      },
    });

    expect(result).toBe('not-json');
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

  test('surfaces object-bodied Notion API errors without codes or messages', async () => {
    await expect(
      appendNotionCodexReply({
        pageId: 'page-123',
        runId: 'run-123',
        message: 'hello',
        token: 'token-123',
        async fetchImpl() {
          return {
            ok: false,
            status: 500,
            async text() {
              return JSON.stringify({});
            },
          };
        },
      })
    ).rejects.toThrow('HTTP 500: ');
  });

  test('surfaces string-bodied Notion API error details', async () => {
    await expect(
      appendNotionCodexReply({
        pageId: 'page-123',
        runId: 'run-123',
        message: 'hello',
        token: 'token-123',
        async fetchImpl() {
          return {
            ok: false,
            status: 500,
            async text() {
              return 'forbidden';
            },
          };
        },
      })
    ).rejects.toThrow('HTTP 500: forbidden');
  });
});
