import { jest, test, expect } from '@jest/globals';
import { createWebMcpHandle } from '../../src/core/browser/webmcp.js';

/**
 * Build a normal text toy with optional metadata overrides.
 * @param {object} extra Metadata.
 * @returns {object} Post.
 */
function post(extra = {}) {
  return {
    key: 'PURE1',
    title: 'Pure toy',
    content: ['Description'],
    tags: ['toy'],
    toy: {
      modulePath: '/core/browser/toys/pure.js',
      functionName: 'pure',
      defaultInputMethod: 'textarea',
      defaultOutputMethod: 'textarea',
    },
    ...extra,
  };
}

/**
 * Create isolated tool adapters and observations.
 * @param {object} options Scenario.
 * @param {object} [options.blog] Catalog.
 * @param {boolean} [options.ok] HTTP success.
 * @param {Function} [options.loader] Module loader.
 * @param {boolean} [options.withLocation] Provide location.
 * @param {boolean} [options.withContext] Provide model context.
 * @param {Function} [options.invokeCapabilityFn] Override capability invocation.
 * @returns {object} Controller fixture.
 */
function fixture({
  blog = { posts: [post()] },
  ok = true,
  loader = async () => ({ pure: input => input }),
  withLocation = true,
  withContext = true,
  invokeCapabilityFn,
} = {}) {
  const tools = new Map();
  const modelContext = {
    registerTool: jest.fn(tool => tools.set(tool.name, tool)),
  };
  const fetchFn = jest.fn(async () => ({
    ok,
    status: 503,
    json: async () => blog,
  }));
  const importModule = jest.fn(loader);
  const locationObj = {
    href: 'https://example.test/page',
    origin: 'https://example.test',
    assign: jest.fn(),
  };
  const documentObj = {
    title: 'Example',
    querySelectorAll: selector =>
      selector === 'h1, h2'
        ? [{ textContent: ' Heading ' }, { textContent: ' ' }]
        : [
            { textContent: ' Link ', href: 'https://example.test/next' },
            { textContent: '', href: '/empty' },
          ],
  };
  const handle = createWebMcpHandle({
    fetchFn,
    bindEffectBoundary: handler => handler(Object.freeze({})),
    importModule,
    invokeCapabilityFn,
    documentObj,
    locationObj: withLocation ? locationObj : undefined,
    modelContext: withContext ? modelContext : undefined,
    URLCtor: URL,
  });
  return { handle, fetchFn, importModule, tools, locationObj };
}

test('catalog skips incomplete toys, resolves defaults and caches concurrent loads', async () => {
  const complete = post();
  const { handle, fetchFn } = fixture({
    withLocation: false,
    blog: {
      posts: [
        {},
        { toy: {} },
        { toy: { modulePath: '/missing-export' } },
        post({ content: [{ type: 'manual' }], tags: undefined }),
        post({ key: 'NO_CONTENT', content: undefined }),
        post({
          key: 'KEYBOARD',
          toy: { ...complete.toy, defaultInputMethod: 'keyboard' },
        }),
        post({
          key: 'CANVAS',
          toy: { ...complete.toy, defaultOutputMethod: 'canvas' },
        }),
        ...['storage', 'ledger', 'game', 'voice', 'capture', 'persistence'].map(
          part =>
            post({
              key: part,
              toy: {
                ...complete.toy,
                modulePath: `/core/${part.toUpperCase()}.js`,
              },
            })
        ),
      ],
    },
  });
  const [first, second] = await Promise.all([
    handle.listToys(),
    handle.listToys(),
  ]);
  expect(first).toEqual(second);
  expect(fetchFn).toHaveBeenCalledTimes(1);
  expect(first[0]).toMatchObject({
    description: 'Pure toy',
    tags: [],
    url: 'https://mattheard.net/#PURE1',
    runnable: true,
  });
  expect(first[1].description).toBe('Pure toy');
  expect(first.slice(2).every(toy => toy.runnable === false)).toBe(true);
  expect(first[0]).not.toHaveProperty('modulePath');
  expect(first[0]).not.toHaveProperty('functionName');
});

test('missing posts return an empty list and HTTP errors remain cached', async () => {
  await expect(fixture({ blog: {} }).handle.listToys()).resolves.toEqual([]);
  const { handle, fetchFn } = fixture({ ok: false });
  await expect(handle.listToys()).rejects.toThrow(
    'Toy catalog request failed: 503'
  );
  await expect(handle.listToys()).rejects.toThrow('503');
  expect(fetchFn).toHaveBeenCalledTimes(1);
});

test('invalid, unknown and forbidden requests never load implementation modules', async () => {
  const { handle, importModule, fetchFn } = fixture();
  await expect(handle.runToy({ toy: 7, input: 'text' })).resolves.toMatchObject(
    { error: { code: 'INVALID_INPUT' } }
  );
  await expect(
    handle.runToy({ toy: 'PURE1', input: null })
  ).resolves.toMatchObject({ error: { code: 'INVALID_INPUT' } });
  expect(fetchFn).not.toHaveBeenCalled();
  await expect(
    handle.runToy({ toy: 'missing', input: '' })
  ).resolves.toMatchObject({ error: { code: 'UNKNOWN_TOY' } });
  const forbidden = fixture({
    blog: { posts: [post({ toy: { ...post().toy, modulePath: '/game.js' } })] },
  });
  await expect(
    forbidden.handle.runToy({ toy: 'PURE1', input: '' })
  ).resolves.toMatchObject({ error: { code: 'TOY_NOT_RUNNABLE' } });
  expect(importModule).not.toHaveBeenCalled();
  expect(forbidden.importModule).not.toHaveBeenCalled();
});

test('execution bounds text and serializes asynchronous structured results', async () => {
  const plain = fixture();
  await expect(
    plain.handle.runToy({ toy: 'PURE1', input: 'x'.repeat(1500) })
  ).resolves.toEqual({
    toy: 'PURE1',
    ok: true,
    output: 'x'.repeat(1500),
    truncated: false,
  });
  await expect(
    plain.handle.runToy({ toy: 'PURE1', input: 'x'.repeat(1501) })
  ).resolves.toEqual({
    toy: 'PURE1',
    ok: true,
    output: 'x'.repeat(1500),
    truncated: true,
    originalLength: 1501,
  });
  expect(plain.importModule).toHaveBeenCalledWith('/core/browser/toys/pure.js');
  const structured = fixture({
    loader: async () => ({ pure: async () => ({ answer: 42 }) }),
  });
  await expect(
    structured.handle.runToy({ toy: 'PURE1', input: '' })
  ).resolves.toMatchObject({ output: '{"answer":42}', truncated: false });
});

test.each([
  [async () => ({}), 'Toy implementation is unavailable.'],
  [
    async () => {
      throw new Error('Import failed');
    },
    'Import failed',
  ],
  [
    async () => ({
      pure: () => {
        throw 'not-an-error';
      },
    }),
    'Toy execution failed.',
  ],
  [
    async () => ({ pure: () => undefined }),
    'Cannot read properties of undefined',
  ],
])('execution failures preserve stable codes', async (loader, message) => {
  const { handle } = fixture({ loader });
  const result = await handle.runToy({ toy: 'PURE1', input: '' });
  expect(result).toMatchObject({
    ok: false,
    error: { code: 'TOY_EXECUTION_FAILED' },
  });
  expect(result.error.message).toContain(message);
});

test('unsupported contexts are no-ops with no fetches', () => {
  const { handle, fetchFn, tools } = fixture({ withContext: false });
  expect(() => handle()).not.toThrow();
  expect(() => handle.registerWebMcpTools()).not.toThrow();
  expect(() => handle.registerWebMcpTools({})).not.toThrow();
  expect(() => handle.registerWebMcpTools(null)).not.toThrow();
  expect(tools.size).toBe(0);
  expect(fetchFn).not.toHaveBeenCalled();
  const emptyContext = createWebMcpHandle({
    fetchFn,
    importModule: async () => ({}),
    modelContext: {},
    URLCtor: URL,
  });
  expect(() => emptyContext()).not.toThrow();
});

test('capability invocation failures return safe structured errors', async () => {
  const { handle, tools } = fixture({
    invokeCapabilityFn: () => {
      throw new Error('private runtime detail');
    },
  });
  handle();

  expect(
    tools.get('dadeto_canonicalize_json').execute({ input: '{}' })
  ).toEqual({
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          error: {
            code: 'CAPABILITY_FAILED',
            message: 'Capability could not be completed.',
          },
        }),
      },
    ],
  });
});

test('tool callbacks use shared execution and enforce same-origin navigation', async () => {
  const { handle, tools, locationObj } = fixture();
  handle();
  expect([...tools.keys()]).toEqual([
    'list_toys',
    'run_toy',
    'dadeto_canonicalize_json',
    'get_page_summary',
    'navigate_to',
  ]);
  expect(tools.get('list_toys').annotations).toEqual({ readOnlyHint: true });
  const listed = JSON.parse(
    (await tools.get('list_toys').execute()).content[0].text
  );
  expect(listed.toys[0]).toMatchObject({
    description: 'Description',
    url: 'https://example.test/page#PURE1',
  });
  const executed = JSON.parse(
    (await tools.get('run_toy').execute({ toy: 'PURE1', input: 'hello' }))
      .content[0].text
  );
  expect(executed).toMatchObject({ output: 'hello', ok: true });
  const summary = JSON.parse(
    (await tools.get('get_page_summary').execute()).content[0].text
  );
  expect(summary).toEqual({
    title: 'Example',
    url: locationObj.href,
    headings: ['Heading'],
    links: [{ label: 'Link', href: 'https://example.test/next' }],
  });
  expect(tools.get('navigate_to').execute({ path: '/next' })).toEqual({
    content: [{ type: 'text', text: 'Navigating to /next' }],
  });
  expect(locationObj.assign).toHaveBeenCalledWith('https://example.test/next');
  expect(() =>
    tools.get('navigate_to').execute({ path: 'https://other.test/' })
  ).toThrow('Navigation is limited to this site');
  expect(locationObj.assign).toHaveBeenCalledTimes(1);
});
