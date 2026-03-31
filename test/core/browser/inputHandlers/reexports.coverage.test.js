import { gamepadCaptureHandler } from '../../../../src/core/browser/inputHandlers/gamepadCapture.js';
import { joyConMapperHandler } from '../../../../src/core/browser/inputHandlers/joyConMapper.js';

describe('core input handler reexports', () => {
  it('reexports handler functions', () => {
    expect(typeof gamepadCaptureHandler).toBe('function');
    expect(typeof joyConMapperHandler).toBe('function');
  });
});
