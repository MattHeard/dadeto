import { createRealtimeVoicePrototypePresenterHandle } from '../../core/browser/presenters/realtimeVoicePrototype.js';
import { bindEffectBoundary } from '../allow-effects.js';

const handle = createRealtimeVoicePrototypePresenterHandle({
  bindEffectBoundary,
  fetchFn: (
    /** @type {import('../../../types/allow-effects').AllowEffects} */ permission,
    input,
    init
  ) => {
    void permission;
    return globalThis.fetch(input, init);
  },
});

export const { createRealtimeVoicePrototypeElement } = handle;

export { realtimeVoicePrototypePresenterTestOnly } from '../../core/browser/presenters/realtimeVoicePrototype.js';
export { handle };
