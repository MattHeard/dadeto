import {
  buildRealtimeVoiceSessionConfig,
  buildRealtimeVoiceSessionConfigJson,
} from '../../src/core/realtime/sessionConfig.js';

describe('Realtime voice session config', () => {
  test('builds the minimal OpenAI Realtime WebRTC session config', () => {
    expect(buildRealtimeVoiceSessionConfig()).toEqual({
      type: 'realtime',
      model: 'gpt-realtime-2',
      audio: {
        output: {
          voice: 'marin',
        },
      },
      reasoning: {
        effort: 'low',
      },
    });
  });

  test('serializes the session config for multipart form submission', () => {
    expect(JSON.parse(buildRealtimeVoiceSessionConfigJson())).toEqual(
      buildRealtimeVoiceSessionConfig()
    );
  });
});
