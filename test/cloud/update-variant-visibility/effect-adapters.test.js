import { jest } from '@jest/globals';
import { createAllowEffects } from '../../../src/cloud/allow-effects.js';
import { createUpdateVariantVisibilityEffectAdapters } from '../../../src/cloud/update-variant-visibility/effect-adapters.js';

describe('update-variant-visibility effect adapters', () => {
  it('updates a Firestore document through the permission-first adapter', async () => {
    const allowEffects = createAllowEffects();
    const reference = { update: jest.fn().mockResolvedValue(undefined) };
    const data = { visibility: 0.75 };
    const { updateFirestoreDocument } =
      createUpdateVariantVisibilityEffectAdapters();

    await updateFirestoreDocument(allowEffects, reference, data);

    expect(reference.update).toHaveBeenCalledWith(data);
  });
});
