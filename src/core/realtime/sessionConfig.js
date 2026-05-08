export const OPENAI_REALTIME_MODEL = 'gpt-realtime-2';
export const OPENAI_REALTIME_VOICE = 'marin';
export const OPENAI_REALTIME_REASONING_EFFORT = 'low';

/**
 * Build the minimal OpenAI Realtime session configuration for the voice prototype.
 * @returns {{type: string, model: string, audio: {output: {voice: string}}, reasoning: {effort: string}}}
 *   Session configuration accepted by /v1/realtime/calls.
 */
export function buildRealtimeVoiceSessionConfig() {
  return {
    type: 'realtime',
    model: OPENAI_REALTIME_MODEL,
    audio: {
      output: {
        voice: OPENAI_REALTIME_VOICE,
      },
    },
    reasoning: {
      effort: OPENAI_REALTIME_REASONING_EFFORT,
    },
  };
}

/**
 * Serialize the minimal Realtime session configuration for multipart form upload.
 * @returns {string} JSON encoded session configuration.
 */
export function buildRealtimeVoiceSessionConfigJson() {
  return JSON.stringify(buildRealtimeVoiceSessionConfig());
}
