import { jest } from '@jest/globals';
import {
  createRenderAuthorHandler,
  renderAuthorPage,
} from '../../../../src/core/cloud/render-author/render-author-core.js';

describe('renderAuthorPage', () => {
  test('renders the escaped author page path and html', () => {
    const result = renderAuthorPage({ uuid: 'u1', name: '<Writer>' });
    expect(result.path).toBe('a/u1.html');
    expect(result.html).toContain('Dendrite - &lt;Writer&gt;');
  });

  test('returns null without a uuid', () => {
    expect(renderAuthorPage({ name: 'Writer' })).toBeNull();
  });

  test('uses the legacy authorName field and tolerates null input', () => {
    expect(renderAuthorPage({ uuid: 'u2', authorName: 'Legacy' }).html).toContain(
      'Legacy'
    );
    expect(renderAuthorPage(null)).toBeNull();
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
