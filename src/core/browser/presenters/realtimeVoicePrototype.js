import { stringOr } from '../../commonCore.js';
const STATUS = {
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  LIVE: 'live',
  ERROR: 'error',
};

/**
 * Create the Realtime Voice Prototype presenter element.
 * @param {string} inputString Serialized toy payload.
 * @param {object} dom DOM helper facade.
 * @returns {HTMLElement} Realtime voice controls.
 */
export function createRealtimeVoicePrototypeElement(
  inputString,
  dom,
  fetchFn
) {
  const config = parseConfig(inputString);
  const controls = createControls(dom, config);
  const state = createInitialState();

  controls.connectButton.addEventListener('click', () => {
    connectRealtimeVoice(state, controls, dom, fetchFn);
  });
  controls.disconnectButton.addEventListener('click', () => {
    disconnectRealtimeVoice(state, controls, 'Disconnected.', dom);
  });
  controls.muteButton.addEventListener('click', () => {
    toggleMute(state, controls, dom);
  });

  setStatus(controls, STATUS.DISCONNECTED, dom);
  appendDebugLog(
    controls,
    'Toy controls mounted. No audio or SDP is logged.',
    dom
  );
  return controls.root;
}

/**
 * Parse presenter configuration.
 * @param {string} inputString Serialized toy payload.
 * @returns {{title: string, description: string, endpoint: string, serverLabel: string, endpointError: string}} Presenter configuration.
 */
function parseConfig(inputString) {
  try {
    const parsed = JSON.parse(inputString);
    return {
      title: stringOr(parsed.title, 'Realtime Voice Prototype'),
      description: stringOr(
        parsed.description,
        'OpenAI Realtime WebRTC voice toy.'
      ),
      endpoint: stringOr(parsed.endpoint, '/api/realtime/call'),
      serverLabel: stringOr(parsed.serverLabel, 'local server'),
      endpointError: stringOr(parsed.endpointError, ''),
    };
  } catch {
    return {
      title: 'Realtime Voice Prototype',
      description: 'OpenAI Realtime WebRTC voice toy.',
      endpoint: '/api/realtime/call',
      serverLabel: 'local server',
      endpointError: '',
    };
  }
}

/**
 * Create mutable connection state for the prototype.
 * @returns {{peerConnection: RTCPeerConnection | null, mediaStream: MediaStream | null, dataChannel: RTCDataChannel | null, muted: boolean}}
 *   Mutable connection state.
 */
function createInitialState() {
  return {
    peerConnection: null,
    mediaStream: null,
    dataChannel: null,
    muted: false,
  };
}

/**
 * Build the presenter DOM controls.
 * @param {object} dom DOM helper facade.
 * @param {{title: string, description: string, endpoint: string, serverLabel: string, endpointError: string}} config Presenter configuration.
 * @returns {object} Control references.
 */
function createControls(dom, config) {
  const root = dom.createElement('section');
  dom.setClassName(root, 'realtime-voice-toy');
  const title = appendTextElement(root, 'h3', config.title, dom);
  const description = appendTextElement(root, 'p', config.description, dom);
  const serverText = appendTextElement(
    root,
    'p',
    `Session server: ${config.serverLabel}`,
    dom
  );
  const statusText = appendTextElement(root, 'p', STATUS.DISCONNECTED, dom);
  dom.setClassName(statusText, 'realtime-voice-status');

  const buttonRow = dom.createElement('div');
  dom.setClassName(buttonRow, 'realtime-voice-controls');
  const connectButton = appendButton(buttonRow, 'Connect', dom);
  const disconnectButton = appendButton(buttonRow, 'Disconnect', dom);
  const muteButton = appendButton(buttonRow, 'Mute', dom);
  dom.appendChild(root, buttonRow);

  const audioElement = dom.createElement('audio');
  audioElement.autoplay = true;
  audioElement.playsInline = true;
  dom.appendChild(root, audioElement);

  const debugLog = dom.createElement('ol');
  dom.setClassName(debugLog, 'realtime-voice-log');
  dom.appendChild(root, debugLog);

  return {
    root,
    title,
    description,
    serverText,
    endpoint: config.endpoint,
    serverLabel: config.serverLabel,
    endpointError: config.endpointError,
    connectButton,
    disconnectButton,
    muteButton,
    statusText,
    debugLog,
    audioElement,
  };
}

/**
 * Append a text element to a parent.
 * @param {HTMLElement} parent Parent node.
 * @param {string} tagName Element tag name.
 * @param {string} text Text content.
 * @param {object} dom DOM helper facade.
 * @returns {HTMLElement} Created element.
 */
function appendTextElement(parent, tagName, text, dom) {
  const element = dom.createElement(tagName);
  dom.setTextContent(element, text);
  dom.appendChild(parent, element);
  return element;
}

/**
 * Append a button to a parent.
 * @param {HTMLElement} parent Parent node.
 * @param {string} label Button label.
 * @param {object} dom DOM helper facade.
 * @returns {HTMLButtonElement} Created button.
 */
function appendButton(parent, label, dom) {
  const button = dom.createElement('button');
  button.type = 'button';
  dom.setTextContent(button, label);
  dom.appendChild(parent, button);
  return button;
}

/**
 * Connect browser microphone audio to OpenAI Realtime through the configured session server.
 * @param {object} state Mutable connection state.
 * @param {object} controls Page controls.
 * @param {object} dom DOM helper facade.
 * @returns {Promise<void>} Resolves when the SDP answer has been applied.
 */
async function connectRealtimeVoice(state, controls, dom, fetchFn) {
  if (!hasUsableEndpoint(controls, dom)) {
    return;
  }

  disconnectRealtimeVoice(state, controls, 'Reset previous connection.', dom);
  setStatus(controls, STATUS.CONNECTING, dom);
  appendDebugLog(controls, 'Requesting microphone permission.', dom);

  try {
    await startPeerConnection(state, controls, dom, fetchFn);
    setStatus(controls, STATUS.LIVE, dom);
    appendDebugLog(controls, 'Realtime voice connection is live.', dom);
  } catch (error) {
    disconnectRealtimeVoice(
      state,
      controls,
      'Connection cleanup complete.',
      dom
    );
    setStatus(controls, STATUS.ERROR, dom);
    appendDebugLog(controls, formatErrorMessage(error), dom);
  }
}

/**
 * Check whether the selected endpoint is ready before requesting microphone access.
 * @param {object} controls Page controls.
 * @param {object} dom DOM helper facade.
 * @returns {boolean} True when connection can proceed.
 */
function hasUsableEndpoint(controls, dom) {
  if (!controls.endpointError) {
    return true;
  }

  setStatus(controls, STATUS.ERROR, dom);
  appendDebugLog(controls, controls.endpointError, dom);
  return false;
}

/**
 * Start the WebRTC peer connection and apply OpenAI's answer.
 * @param {object} state Mutable connection state.
 * @param {object} controls Page controls.
 * @param {object} dom DOM helper facade.
 * @returns {Promise<void>} Resolves after remote description is set.
 */
async function startPeerConnection(state, controls, dom, fetchFn) {
  const peerConnection = new RTCPeerConnection();
  state.peerConnection = peerConnection;
  wirePeerConnectionEvents(peerConnection, controls, dom);

  const mediaStream = await navigator.mediaDevices.getUserMedia({
    audio: true,
  });
  state.mediaStream = mediaStream;
  addMicrophoneTrack(peerConnection, mediaStream);
  attachRemoteAudio(peerConnection, controls.audioElement);
  createDebugDataChannel(state, peerConnection, controls, dom);

  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);
  appendDebugLog(
    controls,
    `Sending SDP offer to ${controls.serverLabel}.`,
    dom
  );

  const answerSdp = await requestRealtimeAnswer(
    offer.sdp ?? '',
    controls.endpoint,
    fetchFn
  );
  await peerConnection.setRemoteDescription({ type: 'answer', sdp: answerSdp });
  appendDebugLog(
    controls,
    `Applied SDP answer from ${controls.serverLabel}.`,
    dom
  );
}

/**
 * Add the first microphone track to the peer connection.
 * @param {RTCPeerConnection} peerConnection WebRTC peer connection.
 * @param {MediaStream} mediaStream Microphone stream.
 * @returns {void}
 */
function addMicrophoneTrack(peerConnection, mediaStream) {
  const [audioTrack] = mediaStream.getAudioTracks();
  peerConnection.addTrack(audioTrack, mediaStream);
}

/**
 * Attach incoming model audio to the presenter's audio element.
 * @param {RTCPeerConnection} peerConnection WebRTC peer connection.
 * @param {HTMLAudioElement} audioElement Remote playback element.
 * @returns {void}
 */
function attachRemoteAudio(peerConnection, audioElement) {
  peerConnection.addEventListener('track', event => {
    const [remoteStream] = event.streams;
    audioElement.srcObject = remoteStream;
    audioElement.play();
  });
}

/**
 * Create the OpenAI events/debug data channel.
 * @param {object} state Mutable connection state.
 * @param {RTCPeerConnection} peerConnection WebRTC peer connection.
 * @param {object} controls Page controls.
 * @param {object} dom DOM helper facade.
 * @returns {void}
 */
function createDebugDataChannel(state, peerConnection, controls, dom) {
  const dataChannel = peerConnection.createDataChannel('oai-events');
  state.dataChannel = dataChannel;
  dataChannel.addEventListener('open', () => {
    appendDebugLog(controls, 'Data channel opened.', dom);
  });
  dataChannel.addEventListener('message', event => {
    appendDebugLog(
      controls,
      `Event: ${summarizeRealtimeEvent(event.data)}`,
      dom
    );
  });
  dataChannel.addEventListener('close', () => {
    appendDebugLog(controls, 'Data channel closed.', dom);
  });
}

/**
 * Wire basic peer connection lifecycle events into the debug log.
 * @param {RTCPeerConnection} peerConnection WebRTC peer connection.
 * @param {object} controls Page controls.
 * @param {object} dom DOM helper facade.
 * @returns {void}
 */
function wirePeerConnectionEvents(peerConnection, controls, dom) {
  peerConnection.addEventListener('connectionstatechange', () => {
    appendDebugLog(
      controls,
      `Peer state: ${peerConnection.connectionState}.`,
      dom
    );
  });
  peerConnection.addEventListener('iceconnectionstatechange', () => {
    appendDebugLog(
      controls,
      `ICE state: ${peerConnection.iceConnectionState}.`,
      dom
    );
  });
}

/**
 * Request an SDP answer from the configured API-key-holding server.
 * @param {string} offerSdp Browser SDP offer.
 * @param {string} endpoint Local route or cloud URL.
 * @returns {Promise<string>} SDP answer.
 */
async function requestRealtimeAnswer(offerSdp, endpoint, fetchFn) {
  const response = await fetchFn(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/sdp',
    },
    body: offerSdp,
  });

  const answerSdp = await response.text();
  if (!response.ok) {
    throw new Error(formatRealtimeAnswerError(response, answerSdp));
  }
  return answerSdp;
}

/**
 * Format a failed Realtime relay response for users.
 * @param {Response} response Failed relay response.
 * @param {string} responseText Response body text.
 * @returns {string} User-facing error message.
 */
function formatRealtimeAnswerError(response, responseText) {
  const detail = getRealtimeAnswerErrorDetail(responseText);
  const prefix = `Realtime session server failed with status ${response.status}`;
  if (!detail) {
    return `${prefix}.`;
  }

  return `${prefix}: ${detail}`;
}

/**
 * Extract a relay error detail from JSON or plain text.
 * @param {string} responseText Response body text.
 * @returns {string} Error detail or empty string.
 */
function getRealtimeAnswerErrorDetail(responseText) {
  if (!responseText.trim()) {
    return '';
  }

  return getJsonErrorDetail(responseText) || responseText.trim();
}

/**
 * Extract an `error` string from a JSON relay response.
 * @param {string} responseText Response body text.
 * @returns {string} JSON error detail or empty string.
 */
function getJsonErrorDetail(responseText) {
  try {
    const parsed = JSON.parse(responseText);
    if (typeof parsed.error === 'string' && parsed.error.trim()) {
      return parsed.error.trim();
    }
  } catch {
    return '';
  }

  return '';
}

/**
 * Disconnect and release microphone/browser resources.
 * @param {object} state Mutable connection state.
 * @param {object} controls Page controls.
 * @param {string} message Debug log message.
 * @param {object} dom DOM helper facade.
 * @returns {void}
 */
function disconnectRealtimeVoice(state, controls, message, dom) {
  stopMediaStream(state.mediaStream);
  closeDataChannel(state.dataChannel);
  closePeerConnection(state.peerConnection);
  controls.audioElement.srcObject = null;
  state.peerConnection = null;
  state.mediaStream = null;
  state.dataChannel = null;
  state.muted = false;
  dom.setTextContent(controls.muteButton, 'Mute');
  setStatus(controls, STATUS.DISCONNECTED, dom);
  appendDebugLog(controls, message, dom);
}

/**
 * Stop all tracks in a media stream.
 * @param {MediaStream | null} mediaStream Microphone stream.
 * @returns {void}
 */
function stopMediaStream(mediaStream) {
  if (mediaStream) {
    mediaStream.getTracks().forEach(track => track.stop());
  }
}

/**
 * Close a data channel if it exists.
 * @param {RTCDataChannel | null} dataChannel Data channel.
 * @returns {void}
 */
function closeDataChannel(dataChannel) {
  if (dataChannel) {
    dataChannel.close();
  }
}

/**
 * Close a peer connection if it exists.
 * @param {RTCPeerConnection | null} peerConnection WebRTC peer connection.
 * @returns {void}
 */
function closePeerConnection(peerConnection) {
  if (peerConnection) {
    peerConnection.close();
  }
}

/**
 * Toggle microphone track enabled state.
 * @param {object} state Mutable connection state.
 * @param {object} controls Page controls.
 * @param {object} dom DOM helper facade.
 * @returns {void}
 */
function toggleMute(state, controls, dom) {
  state.muted = !state.muted;
  if (state.mediaStream) {
    state.mediaStream.getAudioTracks().forEach(track => {
      track.enabled = !state.muted;
    });
  }
  if (state.muted) {
    dom.setTextContent(controls.muteButton, 'Unmute');
    appendDebugLog(controls, 'Microphone muted.', dom);
  } else {
    dom.setTextContent(controls.muteButton, 'Mute');
    appendDebugLog(controls, 'Microphone live.', dom);
  }
}

/**
 * Set visible connection status.
 * @param {object} controls Page controls.
 * @param {string} status Next status.
 * @param {object} dom DOM helper facade.
 * @returns {void}
 */
function setStatus(controls, status, dom) {
  dom.setTextContent(controls.statusText, status);
}

/**
 * Append a concise debug message without logging raw audio or SDP.
 * @param {object} controls Page controls.
 * @param {string} message Debug message.
 * @param {object} dom DOM helper facade.
 * @returns {void}
 */
function appendDebugLog(controls, message, dom) {
  const item = dom.createElement('li');
  dom.setTextContent(item, `${new Date().toLocaleTimeString()} ${message}`);
  controls.debugLog.prepend(item);
}

/**
 * Summarize a Realtime event payload for debug display.
 * @param {string} payload Data channel payload.
 * @returns {string} Event type or compact fallback.
 */
function summarizeRealtimeEvent(payload) {
  try {
    const event = JSON.parse(payload);
    return event.type ?? 'unknown event';
  } catch {
    return 'unparseable event';
  }
}

/**
 * Format caught errors for the debug log.
 * @param {unknown} error Caught error.
 * @returns {string} Safe error message.
 */
function formatErrorMessage(error) {
  if (error instanceof Error) {
    return `Error: ${error.message}`;
  }
  return 'Error: unknown connection failure.';
}

export const realtimeVoicePrototypePresenterTestOnly = {
  formatRealtimeAnswerError,
  getRealtimeAnswerErrorDetail,
};

/**
 * Create the browser wrapper handle for the realtime voice presenter.
 * @param {{ fetchFn: typeof fetch }} deps Presenter dependencies.
 * @returns {{ createRealtimeVoicePrototypeElement: typeof createRealtimeVoicePrototypeElement }}
 *   Presenter exports exposed through the non-core wrapper.
 */
export function createRealtimeVoicePrototypePresenterHandle(deps) {
  return {
    createRealtimeVoicePrototypeElement: (inputString, dom) =>
      createRealtimeVoicePrototypeElement(inputString, dom, deps.fetchFn),
  };
}
