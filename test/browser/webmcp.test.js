import { jest, test, expect, beforeEach } from '@jest/globals';

const blog = {
  posts: [
    {
      key: 'PURE1',
      title: 'Pure toy',
      publicationDate: '2026-01-01',
      content: ['A pure toy'],
      tags: ['toy'],
      toy: {
        modulePath: '/core/browser/toys/pure.js',
        functionName: 'pure',
        defaultInputMethod: 'textarea',
        defaultOutputMethod: 'textarea',
      },
    },
    {
      key: 'GAME1',
      title: 'Game toy',
      publicationDate: '2026-01-02',
      content: ['A game'],
      tags: ['toy'],
      toy: {
        modulePath: '/core/browser/toys/game.js',
        functionName: 'game',
        defaultInputMethod: 'textarea',
        defaultOutputMethod: 'textarea',
      },
    },
  ],
};

beforeEach(() => {
  jest.resetModules();
  globalThis.fetch = jest.fn(async () => ({
    ok: true,
    json: async () => blog,
  }));
});

test('lists toy metadata without implementation details', async () => {
  const { listToys } = await import('../../src/browser/webmcp.js');
  await expect(listToys()).resolves.toEqual([
    expect.objectContaining({ key: 'PURE1', runnable: true }),
    expect.objectContaining({ key: 'GAME1', runnable: false }),
  ]);
  const toys = await listToys();
  expect(toys[0]).not.toHaveProperty('modulePath');
  expect(toys[0]).not.toHaveProperty('functionName');
});

test('rejects invalid and unknown toy requests deterministically', async () => {
  const { runToy } = await import('../../src/browser/webmcp.js');
  await expect(runToy({ toy: 'PURE1', input: 1 })).resolves.toMatchObject({
    error: { code: 'INVALID_INPUT' },
  });
  await expect(runToy({ toy: 'MISSING', input: 'x' })).resolves.toMatchObject({
    error: { code: 'UNKNOWN_TOY' },
  });
  await expect(runToy({ toy: 'GAME1', input: 'x' })).resolves.toMatchObject({
    error: { code: 'TOY_NOT_RUNNABLE' },
  });
});

test('registration is a no-op without WebMCP', async () => {
  const { registerWebMcpTools } = await import('../../src/browser/webmcp.js');
  expect(() => registerWebMcpTools()).not.toThrow();
  expect(() => registerWebMcpTools({})).not.toThrow();
});
