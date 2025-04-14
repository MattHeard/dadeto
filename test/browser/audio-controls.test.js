import { jest } from '@jest/globals';
import { createPlayClickHandler } from '../../src/browser/audio-controls.js';

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
