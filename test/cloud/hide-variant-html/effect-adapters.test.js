import { describe, expect, it, jest } from '@jest/globals';
import { createHideVariantHtmlEffectAdapters } from '../../../src/cloud/hide-variant-html/effect-adapters.js';

describe('hide variant html effect adapters', () => {
  it('deletes a storage file through the permission-first adapter', async () => {
    const allowEffects = Object.freeze({});
    const remove = jest.fn().mockResolvedValue();
    const storage = {
      bucket: jest.fn(() => ({ file: jest.fn(() => ({ delete: remove })) })),
    };

    await createHideVariantHtmlEffectAdapters().deleteStorageFile(
      allowEffects,
      storage,
      'static',
      'page.html',
      { ignoreNotFound: true }
    );

    expect(storage.bucket).toHaveBeenCalledWith('static');
    expect(remove).toHaveBeenCalledWith({ ignoreNotFound: true });
  });
});
