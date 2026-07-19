import { jest } from '@jest/globals';
import {
  createRenderAuthorHandler,
  renderAuthorPage,
} from '../../../../src/core/cloud/render-author/render-author-core.js';

describe('renderAuthorPage', () => {
  test('renders the escaped author page path and html', () => {
    const result = renderAuthorPage({ uuid: 'u1', name: '<Writer>' }, [
      { pageNumber: 10, name: 'b', content: 'ten variant words here' },
      { pageNumber: 2, name: 'a', content: 'two variant words here' },
    ]);
    expect(result.path).toBe('a/u1.html');
    expect(result.html).toContain('Dendrite - &lt;Writer&gt;');
    expect(result.html.indexOf('/p/2a.html')).toBeLessThan(
      result.html.indexOf('/p/10b.html')
    );
    expect(result.html).toContain('two variant words here');
  });

  test('returns null without a uuid', () => {
    expect(renderAuthorPage({ name: 'Writer' })).toBeNull();
  });

  test('uses the legacy authorName field and tolerates null input', () => {
    expect(
      renderAuthorPage({ uuid: 'u2', authorName: 'Legacy' }).html
    ).toContain('Legacy');
    expect(renderAuthorPage(null)).toBeNull();
  });

  test('renders a rounded moderator reputation percentage', () => {
    const result = renderAuthorPage({ uuid: 'u3', name: 'Moderator' }, [], 75);
    expect(result.html).toContain('Moderator reputation: 75%');
  });

  test('omits moderator reputation when it is unavailable', () => {
    const result = renderAuthorPage({ uuid: 'u4', name: 'Author' });
    expect(result.html).not.toContain('Moderator reputation:');
  });
});

describe('createRenderAuthorHandler', () => {
  test('writes dirty author pages and clears dirty state', async () => {
    const save = jest.fn().mockResolvedValue(undefined);
    const update = jest.fn().mockResolvedValue(undefined);
    const deleteField = jest.fn(() => 'sentinel');
    const handler = createRenderAuthorHandler({
      bucket: { file: jest.fn(() => ({ save })) },
      deleteField,
    });

    await handler({
      after: {
        exists: true,
        data: () => ({ uuid: 'u1', name: 'Writer', dirty: true }),
        ref: { update },
      },
    });

    expect(save).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ contentType: 'text/html' })
    );
    expect(update).toHaveBeenCalledWith({ dirty: 'sentinel' });
  });

  test('renders visible variants found for the author', async () => {
    const save = jest.fn().mockResolvedValue(undefined);
    const pageRef = {
      get: jest.fn().mockResolvedValue({ data: () => ({ number: 3 }) }),
    };
    const query = {
      get: jest.fn().mockResolvedValue({
        docs: [
          {
            ref: { parent: { parent: pageRef } },
            data: () => ({
              authorId: 'author',
              name: 'a',
              content: 'visible text',
            }),
          },
          {
            ref: { parent: { parent: pageRef } },
            data: () => ({
              authorId: 'author',
              name: 'hidden',
              visibility: 0,
              content: 'hidden text',
            }),
          },
        ],
      }),
    };
    const handler = createRenderAuthorHandler({
      bucket: { file: jest.fn(() => ({ save })) },
      db: {
        collectionGroup: jest.fn(() => ({ where: jest.fn(() => query) })),
      },
      deleteField: jest.fn(),
    });
    await handler({
      after: {
        exists: true,
        ref: { id: 'author', update: jest.fn() },
        data: () => ({ uuid: 'u1', name: 'Writer', dirty: true }),
      },
    });
    expect(save.mock.calls[0][0]).toContain('/p/3a.html');
    expect(save.mock.calls[0][0]).not.toContain('hidden text');
  });

  test('loads and rounds the matching moderator reputation', async () => {
    const save = jest.fn().mockResolvedValue(undefined);
    const handler = createRenderAuthorHandler({
      bucket: { file: jest.fn(() => ({ save })) },
      db: {
        collectionGroup: jest.fn(() => ({
          where: jest.fn(() => ({
            get: jest.fn().mockResolvedValue({ docs: [] }),
          })),
        })),
        collection: jest.fn(name =>
          name === 'moderators'
            ? {
                doc: jest.fn(() => ({
                  get: jest.fn().mockResolvedValue({
                    data: () => ({ moderatorReputation: 0.746 }),
                  }),
                })),
              }
            : { doc: jest.fn() }
        ),
      },
      deleteField: jest.fn(),
    });
    await handler({
      after: {
        exists: true,
        ref: { id: 'author', update: jest.fn() },
        data: () => ({ uuid: 'u1', name: 'Moderator', dirty: true }),
      },
    });
    expect(save.mock.calls[0][0]).toBe('a/u1.html');
    expect(save.mock.calls[0][1]).toContain('Moderator reputation: 75%');
  });

  test('skips clean, deleted, and incomplete author documents', async () => {
    const save = jest.fn();
    const handler = createRenderAuthorHandler({
      bucket: { file: jest.fn(() => ({ save })) },
      deleteField: jest.fn(),
    });
    const ref = { update: jest.fn() };
    await handler({ after: { exists: false, data: () => ({}), ref } });
    await handler({ after: { exists: true, data: () => ({}), ref } });
    await handler({
      after: { exists: true, data: () => ({ dirty: true }), ref },
    });
    expect(save).not.toHaveBeenCalled();
    expect(ref.update).not.toHaveBeenCalled();
  });
});
