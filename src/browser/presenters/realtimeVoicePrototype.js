import { createRealtimeVoicePrototypePresenterHandle } from '../../core/browser/presenters/realtimeVoicePrototype.js';

const handle = createRealtimeVoicePrototypePresenterHandle({
  bindEffectBoundary: async handler => {
    const permission = /** @type {import('../../../types/allow-effects').AllowEffects} */ (
      /** @type {unknown} */ (Object.freeze({}))
    );
    return handler(permission);
  },
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
