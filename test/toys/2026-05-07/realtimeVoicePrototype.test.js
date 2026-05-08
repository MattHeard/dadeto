import { realtimeVoicePrototype } from '../../../src/core/browser/toys/2026-05-07/realtimeVoicePrototype.js';

const DEFAULT_DESCRIPTION =
  'Press Connect, grant microphone permission, speak, and listen for streamed OpenAI Realtime audio.';

describe('realtimeVoicePrototype toy', () => {
  test('returns local server config by default', () => {
    expect(JSON.parse(realtimeVoicePrototype(''))).toEqual({
      title: 'Realtime Voice Prototype',
      description: DEFAULT_DESCRIPTION,
      server: 'local',
      serverLabel: 'local server',
      endpoint: '/api/realtime/call',
      endpointError: '',
    });
  });

  test('uses configured local endpoint when local server is selected', () => {
    const payload = realtimeVoicePrototype(
      JSON.stringify({
        server: 'local',
        localEndpoint: '/api/realtime/local-call',
      })
    );

    expect(JSON.parse(payload)).toMatchObject({
      server: 'local',
      serverLabel: 'local server',
      endpoint: '/api/realtime/local-call',
      endpointError: '',
    });
  });

  test('uses configured cloud endpoint when cloud server is selected', () => {
    const payload = realtimeVoicePrototype(
      JSON.stringify({
        server: 'cloud',
        cloudEndpoint: 'https://realtime.example.com/api/realtime/call',
      })
    );

    expect(JSON.parse(payload)).toMatchObject({
      server: 'cloud',
      serverLabel: 'cloud server',
      endpoint: 'https://realtime.example.com/api/realtime/call',
      endpointError: '',
    });
  });

  test('requires a cloud endpoint when cloud server is selected', () => {
    const payload = realtimeVoicePrototype(JSON.stringify({ server: 'cloud' }));

    expect(JSON.parse(payload)).toMatchObject({
      server: 'cloud',
      serverLabel: 'cloud server',
      endpoint: '',
      endpointError: 'Cloud server mode requires a cloudEndpoint URL.',
    });
  });

  test('allows browser-safe title and description overrides', () => {
    const payload = realtimeVoicePrototype(
      JSON.stringify({
        title: 'Cloud Realtime Test',
        description: 'Connect through a deployed SDP relay.',
      })
    );

    expect(JSON.parse(payload)).toMatchObject({
      title: 'Cloud Realtime Test',
      description: 'Connect through a deployed SDP relay.',
    });
  });

  test('does not include API credentials in the browser payload', () => {
    const payload = realtimeVoicePrototype(
      JSON.stringify({
        server: 'cloud',
        cloudEndpoint: 'https://realtime.example.com/api/realtime/call',
        secret: 'sk-test input',
      })
    );

    expect(payload).not.toContain('OPENAI_API_KEY');
    expect(payload).not.toContain('sk-test');
  });
});
