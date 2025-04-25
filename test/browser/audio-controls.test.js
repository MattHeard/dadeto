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
    event = { type: 'click' };
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
    event = { type: 'click' };
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
  it('updates the time display with the current time of the audio', () => {
    // Given
    const audio = { currentTime: 42 };
    const display = { textContent: '' };

    // When
    const updateTimeDisplay = createUpdateTimeDisplay(audio, display);
    updateTimeDisplay();

    // Then
    expect(display.textContent).toContain('42');
  });

  it('handles when audio currentTime is 0', () => {
    // Given
    const audio = { currentTime: 0 };
    const display = { textContent: '' };

    // When
    const updateTimeDisplay = createUpdateTimeDisplay(audio, display);
    updateTimeDisplay();

    // Then
    expect(display.textContent).toContain('0');
  });

  it('displays minutes and seconds when currentTime is 60', () => {
    // Given
    const audio = { currentTime: 60 };
    const display = { textContent: '' };

    // When
    const updateTimeDisplay = createUpdateTimeDisplay(audio, display);
    updateTimeDisplay();

    // Then
    expect(display.textContent).toBe("1:00");
  });
});


describe('setupAudio', () => {
  it('assigns a default id to audio elements without an id', () => {
    // Given
    const audioElements = [
      { id: '', parentNode: { insertBefore: jest.fn() }, addEventListener: jest.fn() },
      { parentNode: { insertBefore: jest.fn() }, addEventListener: jest.fn() }
    ];
    const buttons = [];
    const querySelectorAll = jest.fn((selector) => {
      if (selector === 'audio') {return audioElements;}
      if (selector === 'button') {return buttons;}
      return [];
    });
    const container = { querySelectorAll, removeControlsAttribute: () => {} };

    // When
    setupAudio(
      { getAudioElements: () => audioElements, removeControlsAttribute: () => {} },
      () => {},
      () => ({ className: '', id: '', textContent: '', href: '' }),
      () => '',
      () => {},
      () => {},
      () => {},
      () => {},
      () => {},
      () => {}
    );

    // Then
    expect(audioElements[0].id).toBe('audio-0');
    expect(audioElements[1].id).toBe('audio-1');
  });

  it('does not overwrite existing audio element ids', () => {
    // Given
    const audioElements = [
      { id: 'custom-id', parentNode: { insertBefore: jest.fn() }, addEventListener: jest.fn() }
    ];
    const buttons = [];
    const querySelectorAll = jest.fn((selector) => {
      if (selector === 'audio') {return audioElements;}
      if (selector === 'button') {return buttons;}
      return [];
    });
    const container = { querySelectorAll, removeControlsAttribute: () => {} };

    // When
    setupAudio(
      { getAudioElements: () => audioElements, removeControlsAttribute: () => {} },
      () => {},
      () => ({ className: '', id: '', textContent: '', href: '' }),
      () => '',
      () => {},
      () => {},
      () => {},
      () => {},
      () => {},
      () => {}
    );

    // Then
    expect(audioElements[0].id).toBe('custom-id');
  });

  it('adds audio-controls class and sets correct text on control buttons', () => {
    // Given
    const audioElements = [
      { id: '', parentNode: { insertBefore: jest.fn() }, addEventListener: jest.fn() }
    ];
    const buttons = [];
    const createdElements = [];
    const createElement = (tag) => {
      const element = { className: '', id: '', textContent: '', href: '', addEventListener: jest.fn(), appendChild: jest.fn() };
      createdElements.push(element);
      return element;
    };
    const querySelectorAll = jest.fn((selector) => {
      if (selector === 'audio') {return audioElements;}
      if (selector === 'button') {return buttons;}
      return [];
    });
    const container = { querySelectorAll, removeControlsAttribute: () => {} };

    // When
    setupAudio(
      { getAudioElements: () => audioElements, removeControlsAttribute: () => {} },
      () => {},
      createElement,
      () => '',
      () => {},
      () => {},
      () => {},
      () => {},
      () => {},
      () => {}
    );

    // Then
    expect(createdElements[0].className).toBe('audio-controls');
    const texts = createdElements.map(el => el.textContent).filter(Boolean);
    expect(texts).toEqual(expect.arrayContaining(['PLAY', 'PAUSE', 'STOP']));
  });

  it('adds a time display element with class "audio-time"', () => {
    // Given
    const audioElements = [
      { id: '', parentNode: { insertBefore: jest.fn() }, addEventListener: jest.fn() }
    ];
    const buttons = [];
    const createdElements = [];
    const createElement = (tag) => {
      const element = { className: '', id: '', textContent: '', href: '', addEventListener: jest.fn(), appendChild: jest.fn() };
      createdElements.push(element);
      return element;
    };
    const querySelectorAll = jest.fn((selector) => {
      if (selector === 'audio') {return audioElements;}
      if (selector === 'button') {return buttons;}
      return [];
    });
    const container = { querySelectorAll, removeControlsAttribute: () => {} };

    // When
    setupAudio(
      { getAudioElements: () => audioElements, removeControlsAttribute: () => {} },
      () => {},
      createElement,
      () => '',
      () => {},
      () => {},
      () => {},
      () => {},
      () => {},
      () => {}
    );

    // Then
    const timeElements = createdElements.filter(el => el.className === 'audio-time');
    expect(timeElements.length).toBeGreaterThan(0);
  });
});
