export {
  OPENAI_REALTIME_MODEL,
  OPENAI_REALTIME_VOICE,
  OPENAI_REALTIME_REASONING_EFFORT,
  buildRealtimeVoiceSessionConfig,
  buildRealtimeVoiceSessionConfigJson,
} from '../cloud/realtime-call/session-config.js';

/**
 * Build the minimal OpenAI Realtime session configuration for the voice prototype.
 * @returns {{type: string, model: string, audio: {output: {voice: string}}, reasoning: {effort: string}}}
 *   Session configuration accepted by /v1/realtime/calls.
 */
