import { describe, expect, it, jest } from '@jest/globals';
import {
  saveAuthorHtml,
  updateAuthorDocument,
} from '../../../src/cloud/render-author/effect-adapters.js';

describe('render-author effect adapters', () => {
  it('saves the rendered HTML with its content type', async () => {
    const allowEffects = Object.freeze({});
    const save = jest.fn().mockResolvedValue(undefined);
    const bucket = { file: jest.fn(() => ({ save })) };

    await saveAuthorHtml(allowEffects, bucket, 'a/u1.html', '<p>author</p>');

    expect(bucket.file).toHaveBeenCalledWith('a/u1.html');
    expect(save).toHaveBeenCalledWith('<p>author</p>', {
      contentType: 'text/html',
    });
  });

  it('updates the author document through the permission-first adapter', async () => {
    const allowEffects = Object.freeze({});
    const update = jest.fn().mockResolvedValue(undefined);
    const reference = { update };
    const value = { dirty: 'sentinel' };

    await updateAuthorDocument(allowEffects, reference, value);

    expect(update).toHaveBeenCalledWith(value);
  });
});
