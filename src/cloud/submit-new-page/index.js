import { createEffectStartupBoundary } from '../allow-effects.js';
import { createSubmitNewPageStartup } from './startup.js';

export const handle = createEffectStartupBoundary(createSubmitNewPageStartup);
