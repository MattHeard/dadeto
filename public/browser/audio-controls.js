export const createPlayClickHandler = (audio, stopDefault, playAudio) => {
  return e => {
    stopDefault(e);
    playAudio(audio);
  };
};

export const createPauseClickHandler = (audio, stopDefault, pauseAudio) => {
  return e => {
    stopDefault(e);
    pauseAudio(audio);
  };
};

export const createStopClickHandler = (audio, stopDefault, pauseAudio) => {
  return e => {
    stopDefault(e);
    pauseAudio(audio);
    audio.currentTime = 0;
  };
};

import { setTextContent } from './document.js';

export const createUpdateTimeDisplay = (audio, timeDisplay) => {
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
 */
export function setupAudio(dom) {
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
    timeDisplay.textContent = '0:00';

    const playButton = dom.createElement('a');
    playButton.href = '#';
    playButton.textContent = 'PLAY';
    const onPlayClick = createPlayClickHandler(
      audio,
      dom.stopDefault,
      dom.playAudio
    );
    dom.addEventListener(playButton, 'click', onPlayClick);

    const onPauseClick = createPauseClickHandler(
      audio,
      dom.stopDefault,
      dom.pauseAudio
    );

    const pauseButton = dom.createElement('a');
    pauseButton.href = '#';
    pauseButton.textContent = 'PAUSE';
    dom.addEventListener(pauseButton, 'click', onPauseClick);

    const onStopClick = createStopClickHandler(
      audio,
      dom.stopDefault,
      dom.pauseAudio
    );
    const stopButton = dom.createElement('a');
    stopButton.href = '#';
    stopButton.textContent = 'STOP';
    dom.addEventListener(stopButton, 'click', onStopClick);

    const updateTimeDisplay = createUpdateTimeDisplay(audio, timeDisplay);
    dom.addEventListener(audio, 'timeupdate', updateTimeDisplay);

    dom.appendChild(controlsContainer, playButton);
    dom.appendChild(controlsContainer, dom.createTextNode(' '));
    dom.appendChild(controlsContainer, pauseButton);
    dom.appendChild(controlsContainer, dom.createTextNode(' '));
    dom.appendChild(controlsContainer, stopButton);
    dom.appendChild(controlsContainer, dom.createTextNode(' '));
    dom.appendChild(controlsContainer, timeDisplay);

    dom.insertBefore(audio.parentNode, controlsContainer, audio.nextSibling);
  });
}
