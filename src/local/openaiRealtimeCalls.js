import {
  exchangeRealtimeCallSdp as exchangeRealtimeCallSdpCore,
  resolveOpenAiApiKey,
  buildRealtimeCallForm,
  OPENAI_REALTIME_CALLS_URL,
} from '../core/realtime/openaiRealtimeCalls.js';

export function exchangeRealtimeCallSdp(sdpOffer, options = {}) {
  return exchangeRealtimeCallSdpCore(sdpOffer, {
    ...options,
    fetchImpl: options.fetchImpl ?? globalThis.fetch,
  });
}

export {
  resolveOpenAiApiKey,
  buildRealtimeCallForm,
  OPENAI_REALTIME_CALLS_URL,
};
