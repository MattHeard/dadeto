import {
  exchangeRealtimeCallSdp as exchangeRealtimeCallSdpCore,
  resolveOpenAiApiKey,
  buildRealtimeCallForm,
  OPENAI_REALTIME_CALLS_URL,
} from '../core/realtime/openaiRealtimeCalls.js';

export function exchangeRealtimeCallSdp(sdpOffer, options = {}) {
  const exchangeOptions = options ?? {};
  return exchangeRealtimeCallSdpCore(sdpOffer, {
    ...exchangeOptions,
    fetchImpl: exchangeOptions.fetchImpl ?? globalThis.fetch,
  });
}

export {
  resolveOpenAiApiKey,
  buildRealtimeCallForm,
  OPENAI_REALTIME_CALLS_URL,
};
