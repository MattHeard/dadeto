import { jest } from '@jest/globals';

// Mock the document object
global.document = {
  querySelectorAll: jest.fn().mockReturnValue([]),
};

import {
  createPlayClickHandler,
  createPauseClickHandler,
  createStopClickHandler,
  createUpdateTimeDisplay,
  setupAudio,
} from '../../src/core/browser/audio-controls.js';

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
  let setTextContent;

  beforeEach(() => {
    display = { textContent: '' };
    setTextContent = (element, text) => {
      element.textContent = text;
    };
  });

  it('updates the time display with the current time of the audio', () => {
    // Given
    const audio = { currentTime: 42 };
    const updateTimeDisplay = createUpdateTimeDisplay(
      audio,
      display,
      setTextContent
    );

    // When
    updateTimeDisplay();

    // Then
    expect(display.textContent).toContain('42');
  });

  it('handles when audio currentTime is 0', () => {
    // Given
    const audio = { currentTime: 0 };
    const updateTimeDisplay = createUpdateTimeDisplay(
      audio,
      display,
      setTextContent
    );

    // When
    updateTimeDisplay();

    // Then
    expect(display.textContent).toContain('0');
  });

  it('displays minutes and seconds when currentTime is 60', () => {
    // Given
    const audio = { currentTime: 60 };
    const updateTimeDisplay = createUpdateTimeDisplay(
      audio,
      display,
      setTextContent
    );

    // When
    updateTimeDisplay();

    // Then
    expect(display.textContent).toBe('1:00');
  });
});

describe('setupAudio', () => {
  let createdElements;
  let removeControlsAttribute,
    createElement,
    stopDefault,
    playAudio,
    pauseAudio;
  let audioElement, audioElements, dom, setTextContent;
  beforeEach(() => {
    createdElements = [];
    removeControlsAttribute = () => {};
    createElement = jest.fn(tag => {
      const el = {
        className: '',
        id: '',
        textContent: '',
        href: '',
        addEventListener: jest.fn(),
        appendChild: jest.fn(),
        tagName: tag,
      };
      createdElements.push(el);
      return el;
    });

    stopDefault = () => {};
    playAudio = () => {};
    pauseAudio = () => {};
    audioElement = {};
    audioElements = [audioElement];
    dom = {
      getAudioElements: () => audioElements,
      removeControlsAttribute,
      createElement,
      createTextNode: jest.fn(text => ({ nodeType: 3, textContent: text })),
      insertBefore: jest.fn(),
      appendChild: jest.fn(),
      addEventListener: jest.fn(),
    };
    setTextContent = jest.fn((element, text) => {
      element.textContent = text;
    });
  });

  it('assigns a default id to an audio element with an empty id', () => {
    // Given
    const audioElement = { id: '' };
    const audioElements = [audioElement];

    const getAudioElements = () => audioElements;
    const dom = {
      getAudioElements,
      removeControlsAttribute,
      createElement: () => {
        const el = {
          className: '',
          id: '',
          textContent: '',
          href: '',
          addEventListener: jest.fn(),
          appendChild: jest.fn(),
        };
        createdElements.push(el);
        return el;
      },
      createTextNode: jest.fn(text => ({ nodeType: 3, textContent: text })),
      insertBefore: jest.fn(),
      appendChild: jest.fn(),
      addEventListener: jest.fn(),
      pauseAudio,
      playAudio,
      stopDefault,
    };

    // When
    setupAudio(dom, setTextContent);

    // Then
    expect(audioElement.id).toBe('audio-0');
  });

  it('assigns a default id to an audio element with undefined id', () => {
    // Given
    const audioElement = {};
    const audioElements = [audioElement];
    const getAudioElements = () => audioElements;
    const dom = {
      getAudioElements,
      removeControlsAttribute,
      createElement: () => {
        const el = {
          className: '',
          id: '',
          textContent: '',
          href: '',
          addEventListener: jest.fn(),
          appendChild: jest.fn(),
        };
        createdElements.push(el);
        return el;
      },
      createTextNode: jest.fn(text => ({ nodeType: 3, textContent: text })),
      insertBefore: jest.fn(),
      appendChild: jest.fn(),
      addEventListener: jest.fn(),
      pauseAudio,
      playAudio,
      stopDefault,
    };

    // When
    setupAudio(dom, setTextContent);

    // Then
    expect(audioElement.id).toBe('audio-0');
  });

  it('does not overwrite existing audio element ids', () => {
    // Given
    const element = { id: 'custom-id' };
    const audioElements = [element];

    const getAudioElements = () => audioElements;
    const dom = {
      getAudioElements,
      removeControlsAttribute,
      createElement: () => {
        const el = {
          className: '',
          id: '',
          textContent: '',
          href: '',
          addEventListener: jest.fn(),
          appendChild: jest.fn(),
        };
        createdElements.push(el);
        return el;
      },
      createTextNode: jest.fn(text => ({ nodeType: 3, textContent: text })),
      insertBefore: jest.fn(),
      appendChild: jest.fn(),
      addEventListener: jest.fn(),
      pauseAudio,
      playAudio,
      stopDefault,
    };

    // When
    setupAudio(dom, setTextContent);

    // Then
    expect(element.id).toBe('custom-id');
  });

  it('adds audio-controls class to the created control element', () => {
    // Given
    const element = {};

    const audioElements = [element];
    const getAudioElements = () => audioElements;
    const dom = {
      getAudioElements,
      removeControlsAttribute,
      createElement: () => {
        const el = {
          className: '',
          id: '',
          textContent: '',
          href: '',
          addEventListener: jest.fn(),
          appendChild: jest.fn(),
        };
        createdElements.push(el);
        return el;
      },
      createTextNode: jest.fn(text => ({ nodeType: 3, textContent: text })),
      insertBefore: jest.fn(),
      appendChild: jest.fn(),
      addEventListener: jest.fn(),
      pauseAudio,
      playAudio,
      stopDefault,
    };

    // When
    setupAudio(dom, setTextContent);

    // Then
    expect(createdElements[0].className).toBe('audio-controls');
  });

  it('sets the controls container id based on the audio element id', () => {
    // Given
    const element = {};

    const audioElements = [element];
    const getAudioElements = () => audioElements;
    const dom = {
      getAudioElements,
      removeControlsAttribute,
      createElement: () => {
        const el = {
          className: '',
          id: '',
          textContent: '',
          href: '',
          addEventListener: jest.fn(),
          appendChild: jest.fn(),
        };
        createdElements.push(el);
        return el;
      },
      createTextNode: jest.fn(text => ({ nodeType: 3, textContent: text })),
      insertBefore: jest.fn(),
      appendChild: jest.fn(),
      addEventListener: jest.fn(),
      pauseAudio,
      playAudio,
      stopDefault,
    };

    // When
    setupAudio(dom, setTextContent);

    // Then
    expect(createdElements[0].id).toBe(`controls-${audioElements[0].id}`);
  });

  it('inserts controls after the audio element when it has a parent', () => {
    // Given
    const parent = {};
    const nextSibling = {};
    const element = { parentNode: parent, nextSibling };
    const audioElements = [element];
    const getAudioElements = () => audioElements;
    const dom = {
      getAudioElements,
      removeControlsAttribute,
      createElement,
      createTextNode: jest.fn(text => ({ nodeType: 3, textContent: text })),
      insertBefore: jest.fn(),
      appendChild: jest.fn(),
      addEventListener: jest.fn(),
      pauseAudio,
      playAudio,
      stopDefault,
    };

    // When
    setupAudio(dom, setTextContent);

    // Then
    expect(dom.insertBefore).toHaveBeenCalledWith(
      parent,
      createdElements[0],
      nextSibling
    );
  });

  it('sets correct text on control buttons', () => {
    // Given
    const element = {};

    const audioElements = [element];
    const getAudioElements = () => audioElements;
    const dom = {
      getAudioElements,
      removeControlsAttribute,
      createElement: () => {
        const el = {
          className: '',
          id: '',
          textContent: '',
          href: '',
          addEventListener: jest.fn(),
          appendChild: jest.fn(),
        };
        createdElements.push(el);
        return el;
      },
      createTextNode: jest.fn(text => ({ nodeType: 3, textContent: text })),
      insertBefore: jest.fn(),
      appendChild: jest.fn(),
      addEventListener: jest.fn(),
      pauseAudio,
      playAudio,
      stopDefault,
    };

    // When
    setupAudio(dom, setTextContent);

    // Then
    const texts = createdElements.map(el => el.textContent);
    expect(texts).toEqual(expect.arrayContaining(['PLAY', 'PAUSE', 'STOP']));
  });

  it('adds a time display element with class "audio-time"', () => {
    // When
    setupAudio(dom, setTextContent);

    // Then
    const timeElements = createdElements.filter(
      el => el.className === 'audio-time'
    );
    expect(timeElements.length).toBeGreaterThan(0);
    expect(timeElements[0].textContent).toBe('0:00');
  });

  it('uses a span element for the time display', () => {
    // When
    setupAudio(dom, setTextContent);

    // Then
    const timeElement = createdElements.find(
      el => el.className === 'audio-time'
    );
    expect(timeElement.tagName).toBe('span');
  });

  it('attaches a timeupdate listener to the audio element', () => {
    // When
    setupAudio(dom, setTextContent);

    // Then
    expect(dom.addEventListener).toHaveBeenCalledWith(
      audioElement,
      'timeupdate',
      expect.any(Function)
    );
  });

  it('creates a div container for the controls', () => {
    // When
    setupAudio(dom, setTextContent);

    // Then
    expect(createElement).toHaveBeenCalledWith('div');
  });

  it('inserts spacing between the control buttons', () => {
    // When
    setupAudio(dom, setTextContent);

    // Then
    expect(dom.createTextNode).toHaveBeenCalledTimes(3);
    dom.createTextNode.mock.calls.forEach(call => {
      expect(call[0]).toBe(' ');
    });
  });

  it('wires up event listeners and button hrefs correctly', () => {
    // When
    setupAudio(dom, setTextContent);

    // Then
    const playButton = createdElements.find(el => el.textContent === 'PLAY');
    const pauseButton = createdElements.find(el => el.textContent === 'PAUSE');
    const stopButton = createdElements.find(el => el.textContent === 'STOP');

    expect(playButton.tagName).toBe('a');
    expect(pauseButton.tagName).toBe('a');
    expect(stopButton.tagName).toBe('a');

    expect(playButton.href).toBe('#');
    expect(pauseButton.href).toBe('#');
    expect(stopButton.href).toBe('#');

    expect(dom.addEventListener).toHaveBeenNthCalledWith(
      1,
      playButton,
      'click',
      expect.any(Function)
    );
    expect(dom.addEventListener).toHaveBeenNthCalledWith(
      2,
      pauseButton,
      'click',
      expect.any(Function)
    );
    expect(dom.addEventListener).toHaveBeenNthCalledWith(
      3,
      stopButton,
      'click',
      expect.any(Function)
    );
    expect(dom.addEventListener).toHaveBeenNthCalledWith(
      4,
      audioElement,
      'timeupdate',
      expect.any(Function)
    );
  });

  it('creates play, pause and stop buttons as anchor elements', () => {
    // When
    setupAudio(dom, setTextContent);

    // Then
    const playButton = createdElements.find(el => el.textContent === 'PLAY');
    const pauseButton = createdElements.find(el => el.textContent === 'PAUSE');
    const stopButton = createdElements.find(el => el.textContent === 'STOP');

    expect(playButton.tagName).toBe('a');
    expect(pauseButton.tagName).toBe('a');
    expect(stopButton.tagName).toBe('a');
  });

  it('calls createElement with "a" for each control button', () => {
    // When
    setupAudio(dom, setTextContent);

    // Then
    const aCalls = createElement.mock.calls.filter(call => call[0] === 'a');
    expect(aCalls).toHaveLength(3);
  });

  it('creates DOM elements in the correct order', () => {
    // When
    setupAudio(dom, setTextContent);

    // Then
    expect(createElement).toHaveBeenNthCalledWith(1, 'div');
    expect(createElement).toHaveBeenNthCalledWith(2, 'span');
    expect(createElement).toHaveBeenNthCalledWith(3, 'a');
    expect(createElement).toHaveBeenNthCalledWith(4, 'a');
    expect(createElement).toHaveBeenNthCalledWith(5, 'a');
  });

  it('inserts spaces between control buttons', () => {
    // When
    setupAudio(dom, setTextContent);

    // Then
    const spaceArgs = dom.createTextNode.mock.calls.map(call => call[0]);
    expect(spaceArgs).toEqual([' ', ' ', ' ']);

    const textNodes = dom.createTextNode.mock.results.map(
      result => result.value
    );
    expect(dom.appendChild).toHaveBeenNthCalledWith(
      2,
      createdElements[0],
      textNodes[0]
    );
    expect(dom.appendChild).toHaveBeenNthCalledWith(
      4,
      createdElements[0],
      textNodes[1]
    );
    expect(dom.appendChild).toHaveBeenNthCalledWith(
      6,
      createdElements[0],
      textNodes[2]
    );
  });
});
