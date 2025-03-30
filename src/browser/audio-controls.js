// Audio controls functionality
const getAudioElements = (doc) => doc.querySelectorAll("audio");
const createElement = (doc, tag) => doc.createElement(tag);
const playAudio = (audio) => audio.play();
const pauseAudio = (audio) => audio.pause();
const addEventListener = (element, event, func) => {
  element.addEventListener(event, func);
};
const createTextNode = (doc) => doc.createTextNode(" ");
const stopDefault = (e) => e.preventDefault();
const removeControlsAttribute = (audio) => audio.removeAttribute("controls");
const appendChild = (parentNode, newChild) => {
  parentNode.appendChild(newChild);
};
const insertBefore = (parentNode, newChild, refChild) => {
  parentNode.insertBefore(newChild, refChild);
};

export function setupAudio(
  doc,
  getAudioElements,
  removeControlsAttribute,
  createElement,
  createTextNode,
  stopDefault,
  playAudio,
  pauseAudio,
  addEventListener,
  appendChild,
  insertBefore
) {
  const audioElements = getAudioElements(doc);
  
  audioElements.forEach(function(audio, index) {
    removeControlsAttribute(audio);
    
    if (!audio.id) {
      audio.id = "audio-" + index;
    }
    
    const controlsContainer = createElement(doc, "div");
    controlsContainer.className = "audio-controls";
    controlsContainer.id = "controls-" + audio.id;
    
    const timeDisplay = createElement(doc, "span");
    timeDisplay.className = "audio-time";
    timeDisplay.textContent = "0:00";
    
    const playButton = createElement(doc, "a");
    playButton.href = "#";
    playButton.textContent = "PLAY";
    const onPlayClick = (e) => {
      stopDefault(e);
      playAudio(audio);
    };
    addEventListener(playButton, "click", onPlayClick);
    
    const onPauseClick = (e) => {
      stopDefault(e);
      pauseAudio(audio);
    };
    
    const pauseButton = createElement(doc, "a");
    pauseButton.href = "#";
    pauseButton.textContent = "PAUSE";
    addEventListener(pauseButton, "click", onPauseClick);
    
    const onStopClick = (e) => {
      stopDefault(e);
      pauseAudio(audio);
      audio.currentTime = 0;
    };
    const stopButton = createElement(doc, "a");
    stopButton.href = "#";
    stopButton.textContent = "STOP";
    addEventListener(stopButton, "click", onStopClick);
    
    const updateTimeDisplay = () => {
      const minutes = Math.floor(audio.currentTime / 60);
      const seconds = Math.floor(audio.currentTime % 60).toString().padStart(2, "0");
      timeDisplay.textContent = minutes + ":" + seconds;
    };
    addEventListener(audio, "timeupdate", updateTimeDisplay);
     
    appendChild(controlsContainer, playButton);
    appendChild(controlsContainer, createTextNode(doc));
    appendChild(controlsContainer, pauseButton);
    appendChild(controlsContainer, createTextNode(doc));
    appendChild(controlsContainer, stopButton);
    appendChild(controlsContainer, createTextNode(doc));
    appendChild(controlsContainer, timeDisplay);
    
    insertBefore(audio.parentNode, controlsContainer, audio.nextSibling);
  });
}
