export const createPlayClickHandler = (audio, stopDefault, playAudio) => {
  return (e) => {
    stopDefault(e);
    playAudio(audio);
  };
};

export const createPauseClickHandler = (audio, stopDefault, pauseAudio) => {
  return (e) => {
    stopDefault(e);
    pauseAudio(audio);
  };
};

export const createStopClickHandler = (audio, stopDefault, pauseAudio) => {
  return (e) => {
    stopDefault(e);
    pauseAudio(audio);
    audio.currentTime = 0;
  };
};

import { setTextContent } from './document.js';

export const createUpdateTimeDisplay = (audio, timeDisplay) => {
  return () => {
    const minutes = Math.floor(audio.currentTime / 60);
    const seconds = Math.floor(audio.currentTime % 60).toString().padStart(2, "0");
    setTextContent(timeDisplay, minutes + ":" + seconds);
  };
};

export function setupAudio(
  dom,
  createElement,
  createTextNode,
  stopDefault,
  playAudio,
  pauseAudio,
  addEventListener,
  appendChild,
  insertBefore
) {
  const audioElements = dom.getAudioElements();

  audioElements.forEach(function(audio, index) {
    dom.removeControlsAttribute(audio);
    if (!audio.id) {
      audio.id = "audio-" + index;
    }

    const controlsContainer = dom.createElement("div");
    controlsContainer.className = "audio-controls";
    controlsContainer.id = "controls-" + audio.id;

    const timeDisplay = dom.createElement("span");
    timeDisplay.className = "audio-time";
    timeDisplay.textContent = "0:00";

    const playButton = dom.createElement("a");
    playButton.href = "#";
    playButton.textContent = "PLAY";
    const onPlayClick = createPlayClickHandler(audio, stopDefault, playAudio);
    addEventListener(playButton, "click", onPlayClick);

    const onPauseClick = createPauseClickHandler(audio, stopDefault, pauseAudio);

    const pauseButton = createElement("a");
    pauseButton.href = "#";
    pauseButton.textContent = "PAUSE";
    addEventListener(pauseButton, "click", onPauseClick);

    const onStopClick = createStopClickHandler(audio, stopDefault, pauseAudio);
    const stopButton = createElement("a");
    stopButton.href = "#";
    stopButton.textContent = "STOP";
    addEventListener(stopButton, "click", onStopClick);

    const updateTimeDisplay = createUpdateTimeDisplay(audio, timeDisplay);
    addEventListener(audio, "timeupdate", updateTimeDisplay);

    appendChild(controlsContainer, playButton);
    appendChild(controlsContainer, createTextNode(" "));
    appendChild(controlsContainer, pauseButton);
    appendChild(controlsContainer, createTextNode(" "));
    appendChild(controlsContainer, stopButton);
    appendChild(controlsContainer, createTextNode(" "));
    appendChild(controlsContainer, timeDisplay);

    insertBefore(audio.parentNode, controlsContainer, audio.nextSibling);
  });
}
