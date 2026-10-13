import { jest } from '@jest/globals';
import { createAllowEffects } from '../../../src/cloud/allow-effects.js';
import {
  createUpdateVariantVisibilityEffectAdapters,
  registerUpdateVariantVisibilityTrigger,
} from '../../../src/cloud/update-variant-visibility/effect-adapters.js';

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

  it('registers the moderation trigger through the startup permission adapter', () => {
    const allowEffects = createAllowEffects();
    const handler = jest.fn();
    const onCreate = jest.fn(() => 'trigger');
    const document = jest.fn(() => ({ onCreate }));
    const functions = { region: jest.fn(() => ({ firestore: { document } })) };

    expect(
      registerUpdateVariantVisibilityTrigger(allowEffects, functions, handler)
    ).toBe('trigger');

    expect(functions.region).toHaveBeenCalledWith('europe-west1');
    expect(document).toHaveBeenCalledWith('moderationRatings/{ratingId}');
    expect(onCreate).toHaveBeenCalledWith(handler);
  });
});
