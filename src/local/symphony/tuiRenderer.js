import { createSymphonyTuiRendererHandle } from '../../core/local/symphony/tuiRenderer.js';

const handle = createSymphonyTuiRendererHandle();

export const { buildStatusLines } = handle;

export { handle };
