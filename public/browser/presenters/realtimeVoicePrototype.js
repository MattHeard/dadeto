import { createRealtimeVoicePrototypePresenterHandle } from '../../core/browser/presenters/realtimeVoicePrototype.js';

const handle = createRealtimeVoicePrototypePresenterHandle();

export const { createRealtimeVoicePrototypeElement } = handle;

export { realtimeVoicePrototypePresenterTestOnly } from '../../core/browser/presenters/realtimeVoicePrototype.js';
export { handle };
