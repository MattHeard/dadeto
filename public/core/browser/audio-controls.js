/**
 * Helper definitions for audio control wiring.
 * @typedef {object} AudioControlsDomHelpers
 * @property {() => NodeList} getAudioElements - Retrieve the audio tags from the DOM.
 * @property {(audio: HTMLAudioElement) => void} removeControlsAttribute - Strips the native controls attribute from each track.
 * @property {(tag: string) => HTMLElement} createElement - Creates DOM nodes by tag name.
 * @property {(value: string) => Text} createTextNode - Creates plain text nodes for spacing or labels.
 * @property {(event: Event) => void} stopDefault - Prevents default browser behavior on control links.
 * @property {(target: EventTarget, type: string, handler: (event: Event) => void) => void} addEventListener - Adds listeners to DOM nodes.
 * @property {(parent: Node, child: Node) => Node} appendChild - Appends a child node to a parent.
 * @property {(parent: Node, child: Node, refChild: Node | null | undefined) => Node} insertBefore - Inserts nodes before a reference child.
 * @property {(audio: HTMLAudioElement) => void} playAudio - Plays an audio element.
 * @property {(audio: HTMLAudioElement) => void} pauseAudio - Pauses an audio element.
 */

/**
 * Text updater passed from the document helpers.
 * @typedef {(element: HTMLElement, content: string) => void} SetTextContentFn
 */

/**
 * Audio control click factory definition.
 * @typedef {(audio: HTMLAudioElement, stopDefault: (event: Event) => void, action: (audio: HTMLAudioElement) => void) => (event: Event) => void} AudioControlHandlerFactory
 */

/**
 * Payload used when wiring custom audio controls.
 * @typedef {object} AttachAudioControlsOptions
 * @property {AudioControlsDomHelpers} dom - DOM helper utilities.
 * @property {SetTextContentFn} setTextContent - Utility for updating text content.
 * @property {HTMLAudioElement} audio - Audio element targeted by the controls.
 * @property {number} index - Zero-based index used for label generation.
 */

/**
 * Create a click handler that stops the default event and plays given audio.
 * @param {HTMLAudioElement} audio - Audio element to control.
 * @param {(event: Event) => void} stopDefault - Prevents the default click action.
 * @param {(element: HTMLAudioElement) => void} playAudio - Plays the audio element.
 * @returns {(event: Event) => void} Handler bound to the control's click events.
 */
export const createPlayClickHandler = (audio, stopDefault, playAudio) => {
  return e => {
    stopDefault(e);
    playAudio(audio);
  };
};

/**
 * Create a click handler that pauses the audio element.
 * @param {HTMLAudioElement} audio - Audio element target.
 * @param {(event: Event) => void} stopDefault - Prevents the default click action.
 * @param {(audio: HTMLAudioElement) => void} pauseAudio - Pause implementation.
 * @returns {(event: Event) => void} Handler wired to the control.
 */
export const createPauseClickHandler = (audio, stopDefault, pauseAudio) => {
  return createPlayClickHandler(audio, stopDefault, pauseAudio);
};

/**
 * Create a click handler that stops and rewinds the audio element.
 * @param {HTMLAudioElement} audio - Audio element target.
 * @param {(event: Event) => void} stopDefault - Prevents the default click action.
 * @param {(audio: HTMLAudioElement) => void} pauseAudio - Pause implementation used for the stop action.
 * @returns {(event: Event) => void} Handler wired to the control.
 */
export const createStopClickHandler = (audio, stopDefault, pauseAudio) => {
  return e => {
    stopDefault(e);
    pauseAudio(audio);
    audio.currentTime = 0;
  };
};

/**
 * Create an updater that renders the current playback position.
 * @param {HTMLAudioElement} audio - Audio element being tracked.
 * @param {HTMLElement} timeDisplay - Element receiving the formatted time.
 * @param {SetTextContentFn} setTextContent - Utility that updates a node's text.
 * @returns {() => void} Handler that refreshes the timestamp.
 */
export const createUpdateTimeDisplay = (audio, timeDisplay, setTextContent) => {
  return () => {
    const minutes = Math.floor(audio.currentTime / 60);
    const seconds = Math.floor(audio.currentTime % 60)
      .toString()
      .padStart(2, '0');
    setTextContent(timeDisplay, `${minutes}:${seconds}`);
  };
};

/**
 * Set up custom audio controls.
 * @param {AudioControlsDomHelpers} dom - DOM utilities for creating and modifying elements.
 * @param {SetTextContentFn} setTextContent - Utility for updating text content.
 */
export function setupAudio(dom, setTextContent) {
  const audioElements = /** @type {HTMLAudioElement[]} */ (
    Array.from(dom.getAudioElements())
  );
  audioElements.forEach((audio, index) =>
    attachAudioControls({ dom, setTextContent, audio, index })
  );
}

/**
 * Attach the custom controls for a single audio element.
 * @param {AttachAudioControlsOptions} options - Described dependencies and context.
 * @returns {void}
 */
function attachAudioControls({ dom, setTextContent, audio, index }) {
  dom.removeControlsAttribute(audio);
  ensureAudioId(audio, index);

  const controlsContainer = dom.createElement('div');
  controlsContainer.className = 'audio-controls';
  controlsContainer.id = `controls-${audio.id}`;

  const timeDisplay = dom.createElement('span');
  timeDisplay.className = 'audio-time';
  setTextContent(timeDisplay, '0:00');

  /**
   * Create a control button and wire it to the provided handler.
   * @param {string} label - Text displayed on the control.
   * @param {AudioControlHandlerFactory} handlerFactory - Factory creating the click handler.
   * @param {(audio: HTMLAudioElement) => void} actionFn - Audio action invoked by the handler.
   * @returns {void}
   */
  function addControl(label, handlerFactory, actionFn) {
    const button = /** @type {HTMLAnchorElement} */ (dom.createElement('a'));
    button.href = '#';
    button.textContent = label;
    const onClick = handlerFactory(audio, dom.stopDefault, actionFn);
    dom.addEventListener(button, 'click', onClick);
    dom.appendChild(controlsContainer, button);
    dom.appendChild(controlsContainer, dom.createTextNode(' '));
  }

  addControl('PLAY', createPlayClickHandler, dom.playAudio);
  addControl('PAUSE', createPauseClickHandler, dom.pauseAudio);
  addControl('STOP', createStopClickHandler, dom.pauseAudio);

  const updateTimeDisplay = createUpdateTimeDisplay(
    audio,
    timeDisplay,
    setTextContent
  );
  dom.addEventListener(audio, 'timeupdate', updateTimeDisplay);

  dom.appendChild(controlsContainer, timeDisplay);

  insertControlsAfterAudio(dom, audio, controlsContainer);
}

/**
 * Ensures the audio element has a stable id.
 * @param {HTMLAudioElement} audio - Element requiring an id.
 * @param {number} index - Index appended when no id exists.
 * @returns {void}
 */
function ensureAudioId(audio, index) {
  if (!audio.id) {
    audio.id = `audio-${index}`;
  }
}

/**
 * Inserts the controls container next to the audio element when possible.
 * @param {AudioControlsDomHelpers} dom - DOM helpers that perform insertion.
 * @param {HTMLAudioElement} audio - Target audio element.
 * @param {Node} controlsContainer - Node containing the controls.
 * @returns {void}
 */
function insertControlsAfterAudio(dom, audio, controlsContainer) {
  const parent = audio.parentNode;
  if (parent) {
    dom.insertBefore(parent, controlsContainer, audio.nextSibling);
  }
}
