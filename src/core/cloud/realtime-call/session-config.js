export const OPENAI_REALTIME_MODEL = 'gpt-realtime-2';
export const OPENAI_REALTIME_VOICE = 'marin';
export const OPENAI_REALTIME_REASONING_EFFORT = 'low';

/**
 * Build the minimal Realtime voice session configuration.
 * @returns {{type: string, model: string, audio: {output: {voice: string}}, reasoning: {effort: string}}} Session configuration.
 */
export function buildRealtimeVoiceSessionConfig() {
  return {
    type: 'realtime',
    model: OPENAI_REALTIME_MODEL,
    audio: { output: { voice: OPENAI_REALTIME_VOICE } },
    reasoning: { effort: OPENAI_REALTIME_REASONING_EFFORT },
  };
}

/**
 * Serialize the minimal Realtime voice session configuration.
 * @returns {string} JSON session configuration.
 */
export function buildRealtimeVoiceSessionConfigJson() {
  return JSON.stringify(buildRealtimeVoiceSessionConfig());
}
