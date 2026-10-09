import { handleChronoflowTime } from '../../core/cloud/chronoflow-time-core.js';
import { createEffectHttpBoundary } from '../allow-effects.js';
import { createChronoflowHttpResponseAdapter } from './effect-adapters.js';

/** Public GET endpoint; the server runtime is the sole epoch authority. */
export const handle = createEffectHttpBoundary(
  async (allowEffects, request, response) => {
    handleChronoflowTime(
      allowEffects,
      request,
      createChronoflowHttpResponseAdapter(response),
      Date.now
    );
  }
);
