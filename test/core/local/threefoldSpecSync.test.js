import { describe, expect, jest, test } from '@jest/globals';
import {
  createThreefoldSpecSyncCommand,
  extractThreefoldSpecSection,
  fetchThreefoldSpecSnapshot,
  formatThreefoldSpec,
  synchronizeThreefoldSpec,
  validateThreefoldSpecCache,
  runThreefoldSpecSyncCli,
} from '../../../src/core/local/threefoldSpecSync.js';

const section = `## Creative north star\n\n${'requirement '.repeat(100)}\n## Reference context`;
const source = `## Earlier progress\nexcluded\n\n${section}\n\n## Later progress\nalso excluded`;
const lastEditedTime = '2026-10-23T09:05:37.018Z';
const token = 'test-read-token';
const allowEffects = Object.freeze({ testPermission: true });
const bindEffectBoundary = handler => handler(allowEffects);

describe('THREEFOLD Notion spec synchronization', () => {
  test('extracts the inclusive stable section and excludes progress history', () => {
    const result = extractThreefoldSpecSection(source);
    expect(result).toBe(`${section}\n`);
    expect(result).not.toContain('Earlier progress');
    expect(result).not.toContain('Later progress');
  });

  test.each([undefined, '', '  '])('rejects empty Markdown: %p', value => {
    expect(() => extractThreefoldSpecSection(value)).toThrow(
      'The Notion page Markdown is empty.'
    );
  });

  test('rejects absent and duplicated boundaries', () => {
    expect(() => extractThreefoldSpecSection('## Other')).toThrow(
      'exactly one Creative north star'
    );
    expect(() => extractThreefoldSpecSection(`${source}\n${section}`)).toThrow(
      'exactly one Creative north star'
    );
    expect(() =>
      extractThreefoldSpecSection(
        `## Creative north star\n${'x'.repeat(1001)}\n## Other`
      )
    ).toThrow('exactly one Creative north star');
    expect(() =>
      extractThreefoldSpecSection(`${section}\n## Reference context`)
    ).toThrow('exactly one Creative north star');
  });

  test('rejects reversed and unexpectedly short sections', () => {
    expect(() =>
      extractThreefoldSpecSection(
        `## Reference context\n${'x'.repeat(1100)}\n## Creative north star`
      )
    ).toThrow('boundaries are invalid');
    expect(() =>
      extractThreefoldSpecSection(
        '## Creative north star\nshort\n## Reference context'
      )
    ).toThrow('unexpectedly short');
  });

  test('formats deterministic source metadata and normalized timestamps', () => {
    const first = formatThreefoldSpec({ markdown: source, lastEditedTime });
    expect(formatThreefoldSpec({ markdown: source, lastEditedTime })).toBe(
      first
    );
    expect(first).toContain(
      'https://app.notion.com/p/3f5700afc30181f09c09cf6293801919'
    );
    expect(first).toContain('2026-10-23T09:05:37.018Z');
    expect(first).toContain(`${section}\n`);
    expect(first).not.toContain('Earlier progress');
    expect(first).not.toContain('Later progress');
    expect(() =>
      formatThreefoldSpec({ markdown: source, lastEditedTime: 'invalid' })
    ).toThrow('last_edited_time is missing or invalid');
  });

  test('fetches Markdown between matching metadata reads with the injected effect token', async () => {
    const responses = [
      jsonResponse(Object.fromEntries([['last_edited_time', lastEditedTime]])),
      jsonResponse({
        object: 'page_markdown',
        markdown: source,
        truncated: false,
      }),
      jsonResponse(Object.fromEntries([['last_edited_time', lastEditedTime]])),
    ];
    const fetchImpl = jest.fn((permission, url, init) => {
      expect(permission).toBe(allowEffects);
      expect(init.headers.Authorization).toBe(`Bearer ${token}`);
      expect(init.headers['Notion-Version']).toBe('2026-03-11');
      return Promise.resolve(responses.shift());
    });

    const result = await fetchThreefoldSpecSnapshot({
      token,
      fetchImpl,
      bindEffectBoundary,
    });

    expect(result).toEqual({ markdown: source, lastEditedTime });
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(fetchImpl.mock.calls[0][1]).toBe(
      'https://api.notion.com/v1/pages/3f5700af-c301-81f0-9c09-cf6293801919'
    );
    expect(fetchImpl.mock.calls[1][1]).toContain('/markdown');
  });

  test('rejects missing token or effectful dependencies before fetching', async () => {
    const fetchImpl = jest.fn();
    await expect(
      fetchThreefoldSpecSnapshot({ token: '', fetchImpl, bindEffectBoundary })
    ).rejects.toThrow('Notion read token is required');
    await expect(
      fetchThreefoldSpecSnapshot({
        token,
        fetchImpl,
        bindEffectBoundary: undefined,
      })
    ).rejects.toThrow('An allow-effects boundary is required');
    await expect(
      fetchThreefoldSpecSnapshot({
        token,
        fetchImpl: undefined,
        bindEffectBoundary,
      })
    ).rejects.toThrow('A Notion fetch implementation is required');
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  test('rejects HTTP, network, and malformed JSON responses without leaking request details', async () => {
    await expect(
      fetchThreefoldSpecSnapshot({
        token,
        fetchImpl: async () => ({ ok: false, status: 403 }),
        bindEffectBoundary,
      })
    ).rejects.toThrow('page metadata request failed with HTTP 403');
    await expect(
      fetchThreefoldSpecSnapshot({
        token,
        fetchImpl: async () => ({ ok: false }),
        bindEffectBoundary,
      })
    ).rejects.toThrow('page metadata request failed with HTTP unknown');
    await expect(
      fetchThreefoldSpecSnapshot({
        token,
        fetchImpl: async () => {
          throw new Error(token);
        },
        bindEffectBoundary,
      })
    ).rejects.toThrow('page metadata request failed before a response');
    await expect(
      fetchThreefoldSpecSnapshot({
        token,
        fetchImpl: async () => ({
          ok: true,
          json: async () => {
            throw new Error('bad');
          },
        }),
        bindEffectBoundary,
      })
    ).rejects.toThrow('malformed JSON for page metadata');
    await expect(
      fetchThreefoldSpecSnapshot({
        token,
        fetchImpl: async () => jsonResponse([]),
        bindEffectBoundary,
      })
    ).rejects.toThrow('malformed JSON for page metadata');
  });

  test.each([
    [{ object: 'other', markdown: source }, 'invalid page Markdown response'],
    [
      { object: 'page_markdown', markdown: source, truncated: true },
      'truncated page',
    ],
    [
      {
        object: 'page_markdown',
        markdown: source,
        ...Object.fromEntries([['unknown_block_ids', ['id']]]),
      },
      'truncated page',
    ],
    [{ object: 'page_markdown', markdown: '' }, 'empty page Markdown'],
    [
      { object: 'page_markdown', markdown: 'missing boundaries' },
      'exactly one Creative',
    ],
  ])('rejects incomplete Markdown payloads: %p', async (payload, message) => {
    const responses = [
      jsonResponse(Object.fromEntries([['last_edited_time', lastEditedTime]])),
      jsonResponse(payload),
      jsonResponse(Object.fromEntries([['last_edited_time', lastEditedTime]])),
    ];
    await expect(
      fetchThreefoldSpecSnapshot({
        token,
        fetchImpl: async () => responses.shift(),
        bindEffectBoundary,
      })
    ).rejects.toThrow(message);
  });

  test.each([
    [null, lastEditedTime],
    [lastEditedTime, null],
    [lastEditedTime, '2026-10-23T10:00:00.000Z'],
  ])(
    'rejects page changes or missing timestamps during read: %p',
    async (before, after) => {
      const responses = [
        jsonResponse(Object.fromEntries([['last_edited_time', before]])),
        jsonResponse({ object: 'page_markdown', markdown: source }),
        jsonResponse(Object.fromEntries([['last_edited_time', after]])),
      ];
      await expect(
        fetchThreefoldSpecSnapshot({
          token,
          fetchImpl: async () => responses.shift(),
          bindEffectBoundary,
        })
      ).rejects.toThrow('page changed while it was being read');
    }
  );

  test('check mode accepts an exact copy and reports drift without writing', async () => {
    const expected = formatThreefoldSpec({ markdown: source, lastEditedTime });
    const writeFileImpl = jest.fn();
    const shared = syncDependencies({
      current: expected,
      writeFileImpl,
    });
    await expect(
      synchronizeThreefoldSpec({ ...shared, mode: 'check' })
    ).resolves.toBe('current');
    await expect(
      synchronizeThreefoldSpec({
        ...syncDependencies({
          current: 'stale local file',
          writeFileImpl,
        }),
        mode: 'check',
      })
    ).rejects.toThrow('out of date; run npm run threefold:spec:refresh');
    await expect(
      synchronizeThreefoldSpec({ ...shared, mode: 'invalid' })
    ).rejects.toThrow('Choose either check or refresh mode');
    expect(writeFileImpl).not.toHaveBeenCalled();
  });

  test('check mode propagates local read errors other than a missing file', async () => {
    await expect(
      synchronizeThreefoldSpec({
        ...syncDependencies({
          readFileImpl: async () => {
            throw new Error('disk read failed');
          },
        }),
        mode: 'check',
      })
    ).rejects.toThrow('disk read failed');
  });

  test('refresh mode replaces the target only after a temporary file is written', async () => {
    const events = [];
    const dependencies = syncDependencies({
      current: 'old content',
      writeFileImpl: async (_permission, path, content) => {
        events.push(['write', path, content]);
      },
      renameImpl: async (_permission, from, to) => {
        events.push(['rename', from, to]);
      },
    });
    await expect(
      synchronizeThreefoldSpec({ ...dependencies, mode: 'refresh' })
    ).resolves.toBe('refreshed');
    expect(events[0][0]).toBe('write');
    expect(events[1]).toEqual(['rename', '/repo/spec.md.tmp', '/repo/spec.md']);
    expect(events[0][2]).toContain('2026-10-23T09:05:37.018Z');
  });

  test('refresh creates the generated spec when the local file is missing', async () => {
    const events = [];
    const dependencies = syncDependencies({
      current: null,
      writeFileImpl: async (_permission, path) => events.push(['write', path]),
      renameImpl: async (_permission, from, to) =>
        events.push(['rename', from, to]),
    });
    await expect(
      synchronizeThreefoldSpec({ ...dependencies, mode: 'refresh' })
    ).resolves.toBe('refreshed');
    expect(events[1]).toEqual(['rename', '/repo/spec.md.tmp', '/repo/spec.md']);
  });

  test('refresh leaves the target in place and cleans up when replacement fails', async () => {
    const unlinkImpl = jest.fn();
    const dependencies = syncDependencies({
      current: 'old content',
      renameImpl: async () => {
        throw new Error('rename failed');
      },
      unlinkImpl,
    });
    await expect(
      synchronizeThreefoldSpec({ ...dependencies, mode: 'refresh' })
    ).rejects.toThrow('rename failed');
    expect(unlinkImpl).toHaveBeenCalledWith(allowEffects, '/repo/spec.md.tmp');
  });

  test('preserves the replacement error if temporary-file cleanup also fails', async () => {
    const dependencies = syncDependencies({
      current: 'old content',
      renameImpl: async () => {
        throw new Error('rename failed');
      },
      unlinkImpl: async () => {
        throw new Error('cleanup failed');
      },
    });
    await expect(
      synchronizeThreefoldSpec({ ...dependencies, mode: 'refresh' })
    ).rejects.toThrow('rename failed');
  });

  test('does not overwrite the target when source validation fails', async () => {
    const writeFileImpl = jest.fn();
    await expect(
      synchronizeThreefoldSpec({
        ...syncDependencies({ current: 'preserve me', writeFileImpl }),
        mode: 'refresh',
        snapshot: { markdown: 'truncated', lastEditedTime },
      })
    ).rejects.toThrow('exactly one Creative north star');
    expect(writeFileImpl).not.toHaveBeenCalled();
  });

  test('does not touch the local file when the Notion fetch fails', async () => {
    const readFileImpl = jest.fn();
    const writeFileImpl = jest.fn();
    const handle = createThreefoldSpecSyncCommand({
      fetchImpl: async () => ({ ok: false, status: 401 }),
      bindEffectBoundary,
      readFileImpl,
      writeFileImpl,
      renameImpl: jest.fn(),
      unlinkImpl: jest.fn(),
    });
    await expect(
      handle({ mode: 'refresh', token, targetPath: '/repo/spec.md' })
    ).rejects.toThrow('HTTP 401');
    expect(readFileImpl).not.toHaveBeenCalled();
    expect(writeFileImpl).not.toHaveBeenCalled();
  });

  test('best-effort CLI refresh is silent and preserves the cache on missing credentials or fetch failure', async () => {
    const readFileImpl = jest.fn();
    const writeFileImpl = jest.fn();
    const fetchImpl = jest.fn(async () => {
      throw new Error('offline');
    });
    const dependencies = {
      fetchImpl,
      bindEffectBoundary,
      readFileImpl,
      writeFileImpl,
      renameImpl: jest.fn(),
      unlinkImpl: jest.fn(),
    };
    const tryRefresh = candidateToken =>
      runThreefoldSpecSyncCli({
        args: ['--best-effort-refresh'],
        token: candidateToken,
        targetPath: '/repo/spec.md',
        dependencies,
      });

    await expect(tryRefresh('')).resolves.toBeNull();
    await expect(tryRefresh(token)).resolves.toBeNull();
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(readFileImpl).not.toHaveBeenCalled();
    expect(writeFileImpl).not.toHaveBeenCalled();
  });

  test('composes a successful live read with check mode', async () => {
    const responses = [
      jsonResponse(Object.fromEntries([['last_edited_time', lastEditedTime]])),
      jsonResponse({ object: 'page_markdown', markdown: source }),
      jsonResponse(Object.fromEntries([['last_edited_time', lastEditedTime]])),
    ];
    const expected = formatThreefoldSpec({ markdown: source, lastEditedTime });
    const handle = createThreefoldSpecSyncCommand({
      fetchImpl: async () => responses.shift(),
      bindEffectBoundary,
      readFileImpl: async () => expected,
      writeFileImpl: jest.fn(),
      renameImpl: jest.fn(),
      unlinkImpl: jest.fn(),
    });
    await expect(
      handle({ mode: 'check', token, targetPath: '/repo/spec.md' })
    ).resolves.toBe('current');
  });
});

describe('THREEFOLD local spec cache validation', () => {
  const cache = formatThreefoldSpec({ markdown: source, lastEditedTime });

  test('accepts a deterministic cache using only local content', () => {
    expect(validateThreefoldSpecCache(cache)).toBe('valid');
  });

  test.each([
    ['', 'empty'],
    [cache.replace('Source: https://', 'Source: https://wrong.'), 'metadata'],
    [
      cache.replace(lastEditedTime, 'not-a-timestamp'),
      'timestamp is invalid',
    ],
    [cache.replace('Reference context', 'Other context'), 'exactly one'],
    [`${cache}unexpected trailing content\n`, 'deterministic formatting'],
  ])('rejects malformed cache content: %s', (content, message) => {
    expect(() => validateThreefoldSpecCache(content)).toThrow(message);
  });
});

/**
 * Create a mocked successful response.
 * @param {unknown} value Response payload.
 * @returns {{ ok: boolean, json: () => Promise<unknown> }} Mock response.
 */
function jsonResponse(value) {
  return { ok: true, json: async () => value };
}

/**
 * Create default dependencies for the sync operation.
 * @param {Record<string, unknown>} [options] Dependency overrides.
 * @returns {Parameters<typeof synchronizeThreefoldSpec>[0]} Complete sync dependencies.
 */
function syncDependencies(options = {}) {
  const values = {
    mode: 'check',
    snapshot: { markdown: source, lastEditedTime },
    targetPath: '/repo/spec.md',
    readFileImpl: async () => {
      if (options.current === null)
        throw Object.assign(new Error('missing'), { code: 'ENOENT' });
      return String(options.current ?? 'old content');
    },
    writeFileImpl: async () => {},
    renameImpl: async () => {},
    unlinkImpl: async () => {},
    bindEffectBoundary,
    ...options,
  };
  return /** @type {Parameters<typeof synchronizeThreefoldSpec>[0]} */ (values);
}
