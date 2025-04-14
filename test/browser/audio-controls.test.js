import { jest } from '@jest/globals';
import { createPlayClickHandler } from '../../src/browser/audio-controls.js';
import { createStopClickHandler } from '../../src/browser/audio-controls.js';

describe('createPlayClickHandler', () => {
  it('calls stopDefault and playAudio with the correct arguments', () => {
    const audio = {};
    const stopDefault = jest.fn();
    const playAudio = jest.fn();
    const event = { type: 'click' };

    const handler = createPlayClickHandler(audio, stopDefault, playAudio);
    handler(event);

    expect(stopDefault).toHaveBeenCalledWith(event);
    expect(playAudio).toHaveBeenCalledWith(audio);
  });
});

import { createPauseClickHandler } from '../../src/browser/audio-controls.js';

describe('createPauseClickHandler', () => {
  it('calls stopDefault and pauseAudio with the correct arguments', () => {
    const audio = {};
    const stopDefault = jest.fn();
    const pauseAudio = jest.fn();
    const event = { type: 'click' };

    const handler = createPauseClickHandler(audio, stopDefault, pauseAudio);
    handler(event);

    expect(stopDefault).toHaveBeenCalledWith(event);
    expect(pauseAudio).toHaveBeenCalledWith(audio);
  });
});

describe('createStopClickHandler', () => {
  it('calls stopDefault, pauseAudio, and resets audio.currentTime', () => {
    const audio = { currentTime: 123 };
    const stopDefault = jest.fn();
    const pauseAudio = jest.fn();
    const event = { type: 'click' };

    const handler = createStopClickHandler(audio, stopDefault, pauseAudio);
    handler(event);

    expect(stopDefault).toHaveBeenCalledWith(event);
    expect(pauseAudio).toHaveBeenCalledWith(audio);
    expect(audio.currentTime).toBe(0);
  });
});

import { createUpdateTimeDisplay } from '../../src/browser/audio-controls.js';

describe('createUpdateTimeDisplay', () => {
  it('updates the time display with the current time of the audio', () => {
    const audio = { currentTime: 42 };
    const display = { textContent: '' };

    const updateTimeDisplay = createUpdateTimeDisplay(audio, display);
    updateTimeDisplay();

    expect(display.textContent).toContain('42');
  });

  it('handles when audio currentTime is 0', () => {
    const audio = { currentTime: 0 };
    const display = { textContent: '' };

    const updateTimeDisplay = createUpdateTimeDisplay(audio, display);
    updateTimeDisplay();

    expect(display.textContent).toContain('0');
  });
});
