import { jest } from '@jest/globals';
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
  test('normalizes valid and invalid presenter configuration', () => {
    expect(
      realtimeVoicePrototypePresenterTestOnly.parseConfig(
        JSON.stringify({
          title: '',
          description: null,
          endpoint: '',
          serverLabel: '',
          endpointError: 'offline',
        })
      )
    ).toEqual({
      title: 'Realtime Voice Prototype',
      description: 'OpenAI Realtime WebRTC voice toy.',
      endpoint: '/api/realtime/call',
      serverLabel: 'local server',
      endpointError: 'offline',
    });
    expect(
      realtimeVoicePrototypePresenterTestOnly.parseConfig('not json')
    ).toEqual({
      title: 'Realtime Voice Prototype',
      description: 'OpenAI Realtime WebRTC voice toy.',
      endpoint: '/api/realtime/call',
      serverLabel: 'local server',
      endpointError: '',
    });
  });

  test('exposes exact status, state, and response-error contracts', async () => {
    const helpers = realtimeVoicePrototypePresenterTestOnly;
    expect(helpers.STATUS).toEqual({
      DISCONNECTED: 'disconnected',
      CONNECTING: 'connecting',
      LIVE: 'live',
      ERROR: 'error',
    });
    expect(helpers.createInitialState()).toEqual({
      peerConnection: null,
      mediaStream: null,
      dataChannel: null,
      muted: false,
    });
    expect(
      helpers.parseConfig(
        JSON.stringify({
          title: 'Title',
          description: 'Description',
          endpoint: '/voice',
          serverLabel: 'edge',
          endpointError: 'offline',
        })
      )
    ).toEqual({
      title: 'Title',
      description: 'Description',
      endpoint: '/voice',
      serverLabel: 'edge',
      endpointError: 'offline',
    });
    expect(helpers.getJsonErrorDetail('{"error":"  bad  "}')).toBe('bad');
    expect(helpers.getJsonErrorDetail('{"error":12}')).toBe('');
    expect(helpers.getJsonErrorDetail('{"error":{}}')).toBe('');
    expect(helpers.getJsonErrorDetail('{"error":"  "}')).toBe('');
    expect(helpers.getJsonErrorDetail('not json')).toBe('');
    expect(helpers.getRealtimeAnswerErrorDetail('  plain  ')).toBe('plain');
    expect(helpers.getRealtimeAnswerErrorDetail('{"error":"relay"}')).toBe(
      'relay'
    );
    expect(helpers.summarizeRealtimeEvent('{"type":"response.done"}')).toBe(
      'response.done'
    );
    expect(helpers.summarizeRealtimeEvent('{}')).toBe('unknown event');
    expect(helpers.summarizeRealtimeEvent('bad')).toBe('unparseable event');
    expect(helpers.formatErrorMessage(new Error('nope'))).toBe('Error: nope');
    expect(helpers.formatErrorMessage('nope')).toBe(
      'Error: unknown connection failure.'
    );
    const fetchFn = jest.fn(async () => ({ ok: true, text: async () => 'answer' }));
    const failedResponse = { ok: false, status: 418, text: async () => '' };
    await expect(helpers.requestRealtimeAnswer('offer', '/answer', fetchFn)).resolves.toBe(
      'answer'
    );
    expect(fetchFn).toHaveBeenCalledWith('/answer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/sdp' },
      body: 'offer',
    });
    await expect(helpers.requestRealtimeAnswer('offer', '/answer', async () => failedResponse)).rejects.toThrow(
      'Realtime session server failed with status 418.'
    );
  });

  test('builds controls and exercises DOM helper branches', () => {
    const helpers = realtimeVoicePrototypePresenterTestOnly;
    const dom = createDom();
    const controls = helpers.createControls(dom, {
      title: 'Title',
      description: 'Description',
      endpoint: '/endpoint',
      serverLabel: 'server',
      endpointError: '',
    });
    expect(controls.endpoint).toBe('/endpoint');
    expect(controls.serverLabel).toBe('server');
    expect(controls.root.tagName).toBe('SECTION');
    expect(controls.root.className).toBe('realtime-voice-toy');
    expect(controls.title.tagName).toBe('H3');
    expect(controls.description.tagName).toBe('P');
    expect(controls.serverText.tagName).toBe('P');
    expect(controls.title.textContent).toBe('Title');
    expect(controls.description.textContent).toBe('Description');
    expect(controls.serverText.textContent).toBe('Session server: server');
    expect(controls.statusText.textContent).toBe('disconnected');
    expect(controls.statusText.className).toBe('realtime-voice-status');
    expect(controls.connectButton.type).toBe('button');
    expect(controls.connectButton.tagName).toBe('BUTTON');
    expect(controls.connectButton.textContent).toBe('Connect');
    expect(controls.disconnectButton.textContent).toBe('Disconnect');
    expect(controls.muteButton.textContent).toBe('Mute');
    expect(controls.audioElement.autoplay).toBe(true);
    expect(controls.audioElement.playsInline).toBe(true);
    expect(controls.debugLog.tagName).toBe('OL');
    expect(controls.debugLog.className).toBe('realtime-voice-log');
    expect(
      helpers.createControls(dom, {
        title: 'a',
        description: 'b',
        endpoint: 'c',
        serverLabel: 'd',
        endpointError: 'e',
      }).statusText.textContent
    ).toBe(helpers.STATUS.DISCONNECTED);
    const extraParent = dom.createElement('div');
    const extraText = helpers.appendTextElement(extraParent, 'span', 'extra', dom);
    const extraButton = helpers.appendButton(extraParent, 'Extra', dom);
    expect(extraText.textContent).toBe('extra');
    expect(extraButton.tagName).toBe('BUTTON');
    expect(extraButton.type).toBe('button');
    expect(extraButton.textContent).toBe('Extra');
    helpers.setStatus(controls, 'live', dom);
    helpers.appendDebugLog(controls, 'hello', dom);
    expect(controls.statusText.textContent).toBe('live');
    expect(controls.debugLog.children[0].textContent).toContain('hello');
    expect(helpers.hasUsableEndpoint(controls, dom)).toBe(true);
    controls.endpointError = 'bad endpoint';
    expect(helpers.hasUsableEndpoint(controls, dom)).toBe(false);
    expect(controls.statusText.textContent).toBe('error');
    expect(controls.debugLog.children[0].textContent).toContain('bad endpoint');
    helpers.connectRealtimeVoice(
      { mediaStream: null, dataChannel: null, peerConnection: null, muted: false },
      controls,
      dom,
      jest.fn()
    );
    expect(controls.statusText.textContent).toBe('error');
  });

  test('handles media, channel, peer, mute, and remote-audio helpers', () => {
    const helpers = realtimeVoicePrototypePresenterTestOnly;
    const dom = createDom();
    const controls = helpers.createControls(dom, {
      title: 't', description: 'd', endpoint: 'e', serverLabel: 's', endpointError: '',
    });
    const track = { enabled: true, stop: jest.fn() };
    const stream = {
      getAudioTracks: () => [track],
      getTracks: () => [track],
    };
    const state = helpers.createInitialState();
    state.mediaStream = stream;
    const channelListeners = {};
    const channel = {
      addEventListener: (type, fn) => { channelListeners[type] = fn; },
      close: jest.fn(),
    };
    const peerListeners = {};
    const peer = {
      connectionState: 'connected',
      iceConnectionState: 'completed',
      addTrack: jest.fn(),
      addEventListener: (type, fn) => { peerListeners[type] = fn; },
      createDataChannel: jest.fn(() => channel),
      close: jest.fn(),
    };
    helpers.addMicrophoneTrack(peer, stream);
    expect(peer.addTrack).toHaveBeenCalledWith(track, stream);
    helpers.attachRemoteAudio(peer, controls.audioElement);
    controls.audioElement.play = jest.fn();
    peerListeners.track({ streams: ['remote'] });
    expect(controls.audioElement.srcObject).toBe('remote');
    expect(controls.audioElement.play).toHaveBeenCalled();
    helpers.createDebugDataChannel(state, peer, controls, dom);
    expect(peer.createDataChannel).toHaveBeenCalledWith('oai-events');
    channelListeners.open();
    channelListeners.message({ data: '{"type":"ping"}' });
    channelListeners.close();
    helpers.wirePeerConnectionEvents(peer, controls, dom);
    peerListeners.connectionstatechange();
    peerListeners.iceconnectionstatechange();
    helpers.toggleMute(state, controls, dom);
    expect(state.muted).toBe(true);
    expect(track.enabled).toBe(false);
    helpers.toggleMute(state, controls, dom);
    expect(state.muted).toBe(false);
    expect(track.enabled).toBe(true);
    helpers.stopMediaStream(stream);
    helpers.closeDataChannel(channel);
    helpers.closePeerConnection(peer);
    expect(track.stop).toHaveBeenCalled();
    expect(channel.close).toHaveBeenCalled();
    expect(peer.close).toHaveBeenCalled();
    helpers.stopMediaStream(null);
    helpers.closeDataChannel(null);
    helpers.closePeerConnection(null);
    expect(controls.muteButton.textContent).toBe('Mute');
    helpers.appendDebugLog(controls, 'hello', dom);
    expect(controls.debugLog.children[0].textContent).toContain('hello');
  });

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
    const dataChannel = {
      addEventListener: (type, handler) => {
        listeners[`data-${type}`] = handler;
      },
      close: jest.fn(),
    };
    class FakePeerConnection {
      connectionState = 'connected';
      iceConnectionState = 'connected';
      addEventListener(type, handler) {
        listeners[type] = handler;
      }
      addTrack = jest.fn();
      createDataChannel = jest.fn(() => dataChannel);
      createOffer = jest.fn(async () => ({}));
      setLocalDescription = jest.fn(async () => undefined);
      setRemoteDescription = jest.fn(async () => undefined);
      close = jest.fn();
    }
    globalThis.RTCPeerConnection = FakePeerConnection;
    const getUserMedia = jest.fn(async () => stream);
    globalThis.navigator = { mediaDevices: { getUserMedia } };
    const fetchFn = jest.fn(async () => ({
      ok: true,
      text: async () => 'answer',
    }));
    const root = createCoreElement(JSON.stringify({}), dom, fetchFn);
    const buttons = root.children.filter(child => child.tagName === 'DIV')[0]
      .children;
    buttons[0].listeners.click();
    await new Promise(resolve => setTimeout(resolve, 0));
    listeners.connectionstatechange();
    listeners.iceconnectionstatechange();
    listeners.track({ streams: [stream] });
    listeners['data-open']();
    listeners['data-message']({
      data: JSON.stringify({ type: 'response.done' }),
    });
    listeners['data-message']({ data: JSON.stringify({}) });
    listeners['data-message']({ data: 'not json' });
    listeners['data-close']();
    expect(JSON.stringify(root)).toContain('Peer state: connected.');
    expect(JSON.stringify(root)).toContain('ICE state: connected.');
    expect(JSON.stringify(root)).toContain('Data channel opened.');
    expect(JSON.stringify(root)).toContain('Event: response.done');
    expect(JSON.stringify(root)).toContain('Event: unknown event');
    expect(JSON.stringify(root)).toContain('Event: unparseable event');
    expect(JSON.stringify(root)).toContain('Data channel closed.');
    expect(fetchFn).toHaveBeenCalledWith('/api/realtime/call', {
      method: 'POST',
      headers: { 'Content-Type': 'application/sdp' },
      body: '',
    });
    expect(getUserMedia).toHaveBeenCalledWith({ audio: true });
    expect(root.children[5].srcObject).toBe(stream);
    expect(JSON.stringify(root)).toContain('Realtime voice connection is live.');
    buttons[2].listeners.click();
    expect(JSON.stringify(root)).toContain('Microphone muted.');
    buttons[2].listeners.click();
    expect(JSON.stringify(root)).toContain('Microphone live.');
    await buttons[1].listeners.click();
    expect(JSON.stringify(root)).toContain('Disconnected.');
    expect(JSON.stringify(root)).toContain('disconnected');
    buttons[2].listeners.click();
    expect(track.stop).toHaveBeenCalled();
  });

  test('reports endpoint and relay failures without throwing from the click handler', async () => {
    const dom = createDom();
    const root = createCoreElement(
      JSON.stringify({ endpointError: 'Endpoint unavailable' }),
      dom,
      jest.fn()
    );
    const buttons = root.children.filter(child => child.tagName === 'DIV')[0]
      .children;
    await buttons[0].listeners.click();
    const failingFetch = jest.fn(async () => ({
      ok: false,
      status: 400,
      text: async () => '{"error":"bad relay"}',
    }));
    const failingRoot = createCoreElement(
      JSON.stringify({}),
      dom,
      failingFetch
    );
    const failingButtons = failingRoot.children.filter(
      child => child.tagName === 'DIV'
    )[0].children;
    globalThis.RTCPeerConnection = class {
      addEventListener() {}
      close() {}
      addTrack() {}
      createDataChannel() {
        return { addEventListener() {}, close() {} };
      }
      async createOffer() {
        return { sdp: 'offer' };
      }
      async setLocalDescription() {}
      async setRemoteDescription() {}
    };
    globalThis.navigator = {
      mediaDevices: {
        getUserMedia: jest.fn(async () => ({
          getAudioTracks: () => [],
          getTracks: () => [],
        })),
      },
    };
    await failingButtons[0].listeners.click();
    expect(
      realtimeVoicePrototypePresenterTestOnly.getRealtimeAnswerErrorDetail(
        'not json'
      )
    ).toBe('not json');
    expect(
      realtimeVoicePrototypePresenterTestOnly.getRealtimeAnswerErrorDetail(
        '{"message":"no error field"}'
      )
    ).toBe('{"message":"no error field"}');
    expect(
      realtimeVoicePrototypePresenterTestOnly.formatRealtimeAnswerError(
        { status: 400 },
        'plain failure'
      )
    ).toContain('plain failure');
    createCoreElement('not json', dom, failingFetch);
    globalThis.navigator = {
      mediaDevices: {
        getUserMedia: jest.fn(async () => {
          throw 'unknown';
        }),
      },
    };
    const unknownRoot = createCoreElement('{}', dom, failingFetch);
    await unknownRoot.children
      .filter(child => child.tagName === 'DIV')[0]
      .children[0].listeners.click();
  });
});
