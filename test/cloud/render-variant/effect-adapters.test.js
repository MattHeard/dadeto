import { describe, expect, it, jest } from '@jest/globals';
import { createAllowEffects } from '../../../src/cloud/allow-effects.js';
import {
  saveStorageFile,
  setFirestoreDocument,
  updateFirestoreDocument,
} from '../../../src/cloud/render-variant/effect-adapters.js';

describe('render-variant effect adapters', () => {
  it('updates the supplied reference with the caller permission and payload', async () => {
    const allowEffects = createAllowEffects();
    const payload = { treeVisibilitySum: 0.8 };
    const update = jest.fn().mockResolvedValue(undefined);
    const reference = { update };

    await updateFirestoreDocument(allowEffects, reference, payload);

    expect(update).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith(payload);
  });

  it('sets the supplied reference with the caller permission and payload', async () => {
    const allowEffects = createAllowEffects();
    const payload = { targetPageNumber: 12 };
    const set = jest.fn().mockResolvedValue(undefined);
    const reference = { set };

    await setFirestoreDocument(allowEffects, reference, payload);

    expect(set).toHaveBeenCalledTimes(1);
    expect(set).toHaveBeenCalledWith(payload);
  });

  it('saves the supplied Storage file with the caller permission and options', async () => {
    const allowEffects = createAllowEffects();
    const contents = '<main>rendered</main>';
    const options = { contentType: 'text/html' };
    const save = jest.fn().mockResolvedValue('saved');
    const file = { save };

    await expect(
      saveStorageFile(allowEffects, file, contents, options)
    ).resolves.toBe('saved');

    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith(contents, options);
  });
});
