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

export const createPauseClickHandler = (audio, stopDefault, pauseAudio) => {
  return createPlayClickHandler(audio, stopDefault, pauseAudio);
};

export const createStopClickHandler = (audio, stopDefault, pauseAudio) => {
  return e => {
    stopDefault(e);
    pauseAudio(audio);
    audio.currentTime = 0;
  };
};

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
 * @param {object} dom - DOM utilities for creating and modifying elements.
 * @param {Function} setTextContent - Utility for updating text content.
 */
export function setupAudio(dom, setTextContent) {
  const audioElements = dom.getAudioElements();
  audioElements.forEach(function (audio, index) {
    dom.removeControlsAttribute(audio);
    if (!audio.id) {
      audio.id = `audio-${index}`;
    }

    const controlsContainer = dom.createElement('div');
    controlsContainer.className = 'audio-controls';
    controlsContainer.id = `controls-${audio.id}`;

    const timeDisplay = dom.createElement('span');
    timeDisplay.className = 'audio-time';
    setTextContent(timeDisplay, '0:00');

    /**
     *
     * @param label
     * @param handlerFactory
     * @param actionFn
     */
    /**
     * Create a control button and wire it to the provided handler.
     * @param {string} label - Text displayed on the control.
     * @param {(
     *   audio: HTMLAudioElement,
     *   stop: (event: Event) => void,
     *   action: (audio: HTMLAudioElement) => void
     * ) => (event: Event) => void} handlerFactory - Factory creating the click handler.
     * @param {(audio: HTMLAudioElement) => void} actionFn - Audio action invoked by the handler.
     * @returns {void}
     */
    function addControl(label, handlerFactory, actionFn) {
      const button = dom.createElement('a');
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

    dom.insertBefore(audio.parentNode, controlsContainer, audio.nextSibling);
  });
}
