import { createRealtimeVoicePrototypePresenterHandle } from '../../core/browser/presenters/realtimeVoicePrototype.js';

const handle = createRealtimeVoicePrototypePresenterHandle({
  fetchFn: globalThis.fetch,
});

export const { createRealtimeVoicePrototypeElement } = handle;

export { realtimeVoicePrototypePresenterTestOnly } from '../../core/browser/presenters/realtimeVoicePrototype.js';
export { handle };
