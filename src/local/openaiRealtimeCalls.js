import {
  exchangeRealtimeCallSdp as exchangeRealtimeCallSdpCore,
  resolveOpenAiApiKey,
  buildRealtimeCallForm,
  OPENAI_REALTIME_CALLS_URL,
} from '../core/realtime/openaiRealtimeCalls.js';
import {
  bindEffectBoundary,
  createEffectFetchFn,
} from './allow-effects.js';

export function exchangeRealtimeCallSdp(sdpOffer, options = {}) {
  const exchangeOptions = options ?? {};
  return exchangeRealtimeCallSdpCore(sdpOffer, {
    ...exchangeOptions,
    fetchImpl: createEffectFetchFn(
      exchangeOptions.fetchImpl ?? globalThis.fetch.bind(globalThis)
    ),
    bindEffectBoundary: handler => bindEffectBoundary(handler),
  });
}

export {
  resolveOpenAiApiKey,
  buildRealtimeCallForm,
  OPENAI_REALTIME_CALLS_URL,
};
