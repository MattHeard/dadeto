import {
  createRealtimeVoicePrototypeElement,
  realtimeVoicePrototypePresenterTestOnly,
} from '../../../src/browser/presenters/realtimeVoicePrototype.js';
import { createRealtimeVoicePrototypeElement as createCoreElement } from '../../../src/core/browser/presenters/realtimeVoicePrototype.js';

/**
 *
 */
/**
 * Create a small DOM facade for presenter rendering tests.
 * @returns {object} DOM facade.
 */
function createDom() {
  return {
    createElement: tagName => ({
      tagName: tagName.toUpperCase(),
      children: [],
      listeners: {},
      prepend(child) {
        this.children.unshift(child);
      },
      addEventListener(event, handler) {
        this.listeners[event] = handler;
      },
      play: jest.fn(),
    }),
    appendChild: (parent, child) => {
      parent.children.push(child);
      return child;
    },
    setClassName: (element, className) => {
      element.className = className;
    },
    setTextContent: (element, text) => {
      element.textContent = text;
    },
  };
}

describe('createRealtimeVoicePrototypeElement', () => {
  test('renders toy controls without exposing API credentials', () => {
    const dom = createDom();
    const root = createRealtimeVoicePrototypeElement(
      JSON.stringify({
        title: 'Realtime Voice Prototype',
        description: 'Connect over WebRTC.',
        endpoint: 'https://realtime.example.com/api/realtime/call',
        serverLabel: 'cloud server',
      }),
      dom
    );

    const text = JSON.stringify(root);
    expect(root.className).toBe('realtime-voice-toy');
    expect(text).toContain('Connect');
    expect(text).toContain('Disconnect');
    expect(text).toContain('Mute');
    expect(text).toContain('Session server: cloud server');
    expect(text).toContain('Toy controls mounted');
    expect(text).not.toContain('OPENAI_API_KEY');
    expect(text).not.toContain('sk-');
  });
});

describe('realtimeVoicePrototypePresenterTestOnly', () => {
  test('includes relay JSON error details in failed session messages', () => {
    expect(
      realtimeVoicePrototypePresenterTestOnly.formatRealtimeAnswerError(
        { status: 500 },
        '{"error":"OPENAI_API_KEY is required for Realtime calls."}'
      )
    ).toBe(
      'Realtime session server failed with status 500: OPENAI_API_KEY is required for Realtime calls.'
    );
  });

  test('falls back to status when the failed session body is empty', () => {
    expect(
      realtimeVoicePrototypePresenterTestOnly.formatRealtimeAnswerError(
        { status: 503 },
        ''
      )
    ).toBe('Realtime session server failed with status 503.');
  });
});

describe('realtime voice lifecycle', () => {
  test('connects, handles events, mutes, and disconnects', async () => {
    const dom = createDom();
    const track = { enabled: true, stop: jest.fn() };
    const stream = { getAudioTracks: () => [track], getTracks: () => [track] };
    const listeners = {};
    const dataChannel = { addEventListener: (type, handler) => { listeners[`data-${type}`] = handler; }, close: jest.fn() };
    class FakePeerConnection {
      connectionState = 'connected';
      iceConnectionState = 'connected';
      addEventListener(type, handler) { listeners[type] = handler; }
      addTrack = jest.fn();
      createDataChannel = jest.fn(() => dataChannel);
      createOffer = jest.fn(async () => ({}));
      setLocalDescription = jest.fn(async () => undefined);
      setRemoteDescription = jest.fn(async () => undefined);
      close = jest.fn();
    }
    globalThis.RTCPeerConnection = FakePeerConnection;
    globalThis.navigator = { mediaDevices: { getUserMedia: jest.fn(async () => stream) } };
    const fetchFn = jest.fn(async () => ({ ok: true, text: async () => 'answer' }));
    const root = createCoreElement(JSON.stringify({}), dom, fetchFn);
    const buttons = root.children.filter(child => child.tagName === 'DIV')[0].children;
    await buttons[0].listeners.click();
    listeners.connectionstatechange();
    listeners.iceconnectionstatechange();
    listeners.track({ streams: [stream] });
    listeners['data-open']();
    listeners['data-message']({ data: JSON.stringify({ type: 'response.done' }) });
    listeners['data-message']({ data: JSON.stringify({}) });
    listeners['data-message']({ data: 'not json' });
    listeners['data-close']();
    buttons[2].listeners.click();
    buttons[2].listeners.click();
    await buttons[1].listeners.click();
    buttons[2].listeners.click();
    expect(track.stop).toHaveBeenCalled();
  });

  test('reports endpoint and relay failures without throwing from the click handler', async () => {
    const dom = createDom();
    const root = createCoreElement(JSON.stringify({ endpointError: 'Endpoint unavailable' }), dom, jest.fn());
    const buttons = root.children.filter(child => child.tagName === 'DIV')[0].children;
    await buttons[0].listeners.click();
    const failingFetch = jest.fn(async () => ({ ok: false, status: 400, text: async () => '{"error":"bad relay"}' }));
    const failingRoot = createCoreElement(JSON.stringify({}), dom, failingFetch);
    const failingButtons = failingRoot.children.filter(child => child.tagName === 'DIV')[0].children;
    globalThis.RTCPeerConnection = class { addEventListener() {} close() {} addTrack() {} createDataChannel() { return { addEventListener() {}, close() {} }; } async createOffer() { return { sdp: 'offer' }; } async setLocalDescription() {} async setRemoteDescription() {} };
    globalThis.navigator = { mediaDevices: { getUserMedia: jest.fn(async () => ({ getAudioTracks: () => [], getTracks: () => [] })) } };
    await failingButtons[0].listeners.click();
    expect(realtimeVoicePrototypePresenterTestOnly.getRealtimeAnswerErrorDetail('not json')).toBe('not json');
    expect(realtimeVoicePrototypePresenterTestOnly.getRealtimeAnswerErrorDetail('{"message":"no error field"}')).toBe('{"message":"no error field"}');
    expect(realtimeVoicePrototypePresenterTestOnly.formatRealtimeAnswerError({ status: 400 }, 'plain failure')).toContain('plain failure');
    createCoreElement('not json', dom, failingFetch);
    globalThis.navigator = { mediaDevices: { getUserMedia: jest.fn(async () => { throw 'unknown'; }) } };
    const unknownRoot = createCoreElement('{}', dom, failingFetch);
    await unknownRoot.children.filter(child => child.tagName === 'DIV')[0].children[0].listeners.click();
  });
});
