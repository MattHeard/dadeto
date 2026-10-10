import { describe, expect, it, jest } from '@jest/globals';
import { createAllowEffects } from '../../../src/cloud/allow-effects.js';
import { updateVariantDocument } from '../../../src/cloud/render-variant/effect-adapters.js';

describe('render-variant effect adapters', () => {
  it('updates the supplied reference with the caller permission and payload', async () => {
    const allowEffects = createAllowEffects();
    const payload = { treeVisibilitySum: 0.8 };
    const update = jest.fn().mockResolvedValue(undefined);
    const reference = { update };

    await updateVariantDocument(allowEffects, reference, payload);

    expect(update).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith(payload);
  });
});
