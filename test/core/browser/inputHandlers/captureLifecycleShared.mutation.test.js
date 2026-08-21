import { jest } from '@jest/globals';

jest.unstable_mockModule(
  '../../../../src/core/browser/inputHandlers/captureFormShared.js',
  () => ({
    createCaptureToyInput: jest.fn(input => ({
      dom: input.dom,
      textInput: input.textInput,
      autoSubmitCheckbox: input.autoSubmitCheckbox,
    })),
  })
);

const {
  createCaptureButtonUpdater,
  createCaptureLifecycleOptions,
  createGamepadCaptureButtonUpdater,
  createKeyboardCaptureButtonUpdater,
  emitCaptureState,
} = await import(
  '../../../../src/core/browser/inputHandlers/captureLifecycleShared.js'
);

describe('captureLifecycleShared mutation contract', () => {
  it('distinguishes inactive and active button labels', () => {
    const dom = { setTextContent: jest.fn() };
    const button = {};
    const update = createCaptureButtonUpdater('Start', 'Stop');

    update(dom, button, false);
    update(dom, button, true);

    expect(dom.setTextContent).toHaveBeenNthCalledWith(1, button, 'Start');
    expect(dom.setTextContent).toHaveBeenNthCalledWith(2, button, 'Stop');
  });

  it('preserves every lifecycle dependency', () => {
    const options = {
      dom: {},
      button: {},
      textInput: {},
      autoSubmitCheckbox: null,
      updateButtonLabel: jest.fn(),
      emitPayload: jest.fn(),
    };

    expect(createCaptureLifecycleOptions(options)).toEqual(options);
  });

  it.each([
    [createGamepadCaptureButtonUpdater, false, 'Capture gamepad'],
    [createGamepadCaptureButtonUpdater, true, 'Release gamepad'],
    [createKeyboardCaptureButtonUpdater, false, 'Capture keyboard'],
    [createKeyboardCaptureButtonUpdater, true, 'Release keyboard'],
  ])('uses the correct built-in label', (factory, capturing, label) => {
    const dom = { setTextContent: jest.fn() };
    const button = {};

    factory()(dom, button, capturing);

    expect(dom.setTextContent).toHaveBeenCalledWith(button, label);
  });

  it.each([true, false])('emits the exact capture state %s', capturing => {
    const options = {
      dom: {},
      button: {},
      textInput: {},
      autoSubmitCheckbox: null,
      updateButtonLabel: jest.fn(),
      emitPayload: jest.fn(),
    };

    emitCaptureState(options, capturing);

    expect(options.updateButtonLabel).toHaveBeenCalledWith(
      options.dom,
      options.button,
      capturing
    );
    expect(options.emitPayload).toHaveBeenCalledWith(
      {
        dom: options.dom,
        textInput: options.textInput,
        autoSubmitCheckbox: options.autoSubmitCheckbox,
      },
      { type: 'capture', capturing }
    );
  });
});
