import { jest } from '@jest/globals';
import { createPlayClickHandler } from '../../src/browser/audio-controls.js';
import { createStopClickHandler } from '../../src/browser/audio-controls.js';

describe('createPlayClickHandler', () => {
  it('calls stopDefault and playAudio with the correct arguments', () => {
    // Given
    const audio = {};
    const stopDefault = jest.fn();
    const playAudio = jest.fn();
    const event = { type: 'click' };

    // When
    const handler = createPlayClickHandler(audio, stopDefault, playAudio);
    handler(event);

    // Then
    expect(stopDefault).toHaveBeenCalledWith(event);
    expect(playAudio).toHaveBeenCalledWith(audio);
  });
});

import { createPauseClickHandler } from '../../src/browser/audio-controls.js';

describe('createPauseClickHandler', () => {
  it('calls stopDefault and pauseAudio with the correct arguments', () => {
    // Given
    const audio = {};
    const stopDefault = jest.fn();
    const pauseAudio = jest.fn();
    const event = { type: 'click' };

    // When
    const handler = createPauseClickHandler(audio, stopDefault, pauseAudio);
    handler(event);

    // Then
    expect(stopDefault).toHaveBeenCalledWith(event);
    expect(pauseAudio).toHaveBeenCalledWith(audio);
  });
});

describe('createStopClickHandler', () => {
  it('calls stopDefault, pauseAudio, and resets audio.currentTime', () => {
    // Given
    const audio = { currentTime: 123 };
    const stopDefault = jest.fn();
    const pauseAudio = jest.fn();
    const event = { type: 'click' };

    // When
    const handler = createStopClickHandler(audio, stopDefault, pauseAudio);
    handler(event);

    // Then
    expect(stopDefault).toHaveBeenCalledWith(event);
    expect(pauseAudio).toHaveBeenCalledWith(audio);
    expect(audio.currentTime).toBe(0);
  });
});

import { createUpdateTimeDisplay } from '../../src/browser/audio-controls.js';

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

import { setupAudio } from '../../src/browser/audio-controls.js';

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
