import { jest } from '@jest/globals';
import {
  createPlayClickHandler,
  createPauseClickHandler,
  createStopClickHandler,
  createUpdateTimeDisplay,
  setupAudio
} from '../../src/browser/audio-controls.js';

describe('createPlayClickHandler', () => {
  let audio;
  let stopDefault;
  let playAudio;
  let event;
  let handler;

  beforeEach(() => {
    audio = {};
    stopDefault = jest.fn();
    playAudio = jest.fn();
    event = {};
    handler = createPlayClickHandler(audio, stopDefault, playAudio);
  });

  it('invokes stopDefault when the play button is clicked', () => {
    // When
    handler(event);

    // Then
    expect(stopDefault).toHaveBeenCalledWith(event);
  });

  it('invokes playAudio to start playback when the play button is clicked', () => {
    // When
    handler(event);

    // Then
    expect(playAudio).toHaveBeenCalledWith(audio);
  });
});


describe('createPauseClickHandler', () => {
  let audio;
  let stopDefault;
  let pauseAudio;
  let event;
  let handler;

  beforeEach(() => {
    audio = {};
    stopDefault = jest.fn();
    pauseAudio = jest.fn();
    event = {};
    handler = createPauseClickHandler(audio, stopDefault, pauseAudio);
  });

  it('invokes stopDefault when the pause button is clicked', () => {
    // When
    handler(event);

    // Then
    expect(stopDefault).toHaveBeenCalledWith(event);
  });

  it('invokes pauseAudio to pause playback when the pause button is clicked', () => {
    // When
    handler(event);

    // Then
    expect(pauseAudio).toHaveBeenCalledWith(audio);
  });
});

describe('createStopClickHandler', () => {
  let audio;
  let stopDefault;
  let pauseAudio;
  let event;
  let handler;

  beforeEach(() => {
    audio = {};
    stopDefault = jest.fn();
    pauseAudio = jest.fn();
    event = {};
    handler = createStopClickHandler(audio, stopDefault, pauseAudio);
  });

  it('calls stopDefault when the stop button is clicked', () => {
    // When
    handler(event);

    // Then
    expect(stopDefault).toHaveBeenCalledWith(event);
  });

  it('calls pauseAudio to pause playback when the stop button is clicked', () => {
    // When
    handler(event);

    // Then
    expect(pauseAudio).toHaveBeenCalledWith(audio);
  });

  it('resets audio.currentTime to 0 when the stop button is clicked', () => {
    // When
    handler(event);

    // Then
    expect(audio.currentTime).toBe(0);
  });
});


describe('createUpdateTimeDisplay', () => {
  let display;

  beforeEach(() => {
    display = { textContent: '' };
  });

  it('updates the time display with the current time of the audio', () => {
    // Given
    const audio = { currentTime: 42 };
    const updateTimeDisplay = createUpdateTimeDisplay(audio, display);

    // When
    updateTimeDisplay();

    // Then
    expect(display.textContent).toContain('42');
  });

  it('handles when audio currentTime is 0', () => {
    // Given
    const audio = { currentTime: 0 };
    const updateTimeDisplay = createUpdateTimeDisplay(audio, display);

    // When
    updateTimeDisplay();

    // Then
    expect(display.textContent).toContain('0');
  });

  it('displays minutes and seconds when currentTime is 60', () => {
    // Given
    const audio = { currentTime: 60 };
    const updateTimeDisplay = createUpdateTimeDisplay(audio, display);

    // When
    updateTimeDisplay();

    // Then
    expect(display.textContent).toBe("1:00");
  });
});


describe('setupAudio', () => {
  let createdElements;
  let removeControlsAttribute, createElement, createTextNode, stopDefault, playAudio, pauseAudio, addEventListener, appendChild, insertBefore;
  let audioElement, audioElements, dom;
  beforeEach(() => {
    createdElements = [];
    removeControlsAttribute = () => {};
    createElement = (tag) => {
      const el = { className: '', id: '', textContent: '', href: '', addEventListener: jest.fn(), appendChild: jest.fn() };
      createdElements.push(el);
      return el;
    };
    createTextNode = () => '';
    stopDefault = () => {};
    playAudio = () => {};
    pauseAudio = () => {};
    addEventListener = () => {};
    appendChild = () => {};
    insertBefore = () => {};
    audioElement = {};
    audioElements = [audioElement];
    dom = { getAudioElements: () => audioElements, removeControlsAttribute, createElement };
  });

  it('assigns a default id to an audio element with an empty id', () => {
    // Given
    const audioElement = { id: '' };
    const audioElements = [audioElement];
        
    const getAudioElements = () => audioElements;
    const dom = { getAudioElements, removeControlsAttribute, createElement, createTextNode };

    // When
    setupAudio(
      dom,
      createElement,
      createTextNode,
      stopDefault,
      playAudio,
      pauseAudio,
      addEventListener,
      appendChild,
      insertBefore
    );

    // Then
    expect(audioElement.id).toBe('audio-0');
  });

  it('assigns a default id to an audio element with undefined id', () => {
    // Given
    const audioElement = {};
    const audioElements = [audioElement];
    const getAudioElements = () => audioElements;
    const dom = { getAudioElements, removeControlsAttribute, createElement, createTextNode };

    // When
    setupAudio(
      dom,
      createElement,
      createTextNode,
      stopDefault,
      playAudio,
      pauseAudio,
      addEventListener,
      appendChild,
      insertBefore
    );

    // Then
    expect(audioElement.id).toBe('audio-0');
  });

  it('does not overwrite existing audio element ids', () => {
    // Given
    const element = { id: 'custom-id' };
    const audioElements = [element];

    const getAudioElements = () => audioElements;
    const dom = { getAudioElements, removeControlsAttribute, createElement, createTextNode };
    // When
    setupAudio(
      dom,
      createElement,
      createTextNode,
      stopDefault,
      playAudio,
      pauseAudio,
      addEventListener,
      appendChild,
      insertBefore
    );

    // Then
    expect(element.id).toBe('custom-id');
  });

  it('adds audio-controls class to the created control element', () => {
    // Given
    const element = {};

    const audioElements = [element];
    const getAudioElements = () => audioElements;
    const dom = { getAudioElements, removeControlsAttribute, createElement, createTextNode };

    // When
    setupAudio(
      dom,
      createElement,
      createTextNode,
      stopDefault,
      playAudio,
      pauseAudio,
      addEventListener,
      appendChild,
      insertBefore
    );

    // Then
    expect(createdElements[0].className).toBe('audio-controls');
  });

  it('sets correct text on control buttons', () => {
    // Given
    const element = {};

    const audioElements = [element];
    const getAudioElements = () => audioElements;
    const dom = { getAudioElements, removeControlsAttribute, createElement, createTextNode };

    // When
    setupAudio(
      dom,
      createElement,
      createTextNode,
      stopDefault,
      playAudio,
      pauseAudio,
      addEventListener,
      appendChild,
      insertBefore
    );

    // Then
    const texts = createdElements.map(el => el.textContent);
    expect(texts).toEqual(expect.arrayContaining(['PLAY', 'PAUSE', 'STOP']));
  });

  it('adds a time display element with class "audio-time"', () => {
    // When
    setupAudio(
      dom,
      createElement,
      createTextNode,
      stopDefault,
      playAudio,
      pauseAudio,
      addEventListener,
      appendChild,
      insertBefore
    );

    // Then
    const timeElements = createdElements.filter(el => el.className === 'audio-time');
    expect(timeElements.length).toBeGreaterThan(0);
  });
});
