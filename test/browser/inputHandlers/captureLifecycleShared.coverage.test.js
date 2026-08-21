import { describe, expect, it, jest } from '@jest/globals';
import {
  createCaptureButtonUpdater,
  createCaptureLifecycleOptions,
  createGamepadCaptureButtonUpdater,
  createKeyboardCaptureButtonUpdater,
  emitCaptureState,
} from '../../../src/core/browser/inputHandlers/captureLifecycleShared.js';

describe('captureLifecycleShared remaining paths', () => {
  it('creates a button updater for both capture states', () => {
    const dom = { setTextContent: jest.fn() };
    const button = {};
    const update = createCaptureButtonUpdater('Start', 'Stop');

    update(dom, button, false);
    update(dom, button, true);

    expect(dom.setTextContent).toHaveBeenNthCalledWith(1, button, 'Start');
    expect(dom.setTextContent).toHaveBeenNthCalledWith(2, button, 'Stop');
  });

  it('creates the gamepad and keyboard label updaters', () => {
    const dom = { setTextContent: jest.fn() };
    const button = {};

    createGamepadCaptureButtonUpdater()(dom, button, false);
    createKeyboardCaptureButtonUpdater()(dom, button, true);

    expect(dom.setTextContent).toHaveBeenNthCalledWith(
      1,
      button,
      'Capture gamepad'
    );
    expect(dom.setTextContent).toHaveBeenNthCalledWith(
      2,
      button,
      'Release keyboard'
    );
  });

  it('returns the shared lifecycle option fields', () => {
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

  it('updates the label and emits capture state to the toy input', () => {
    const dom = {};
    const button = {};
    const textInput = {};
    const autoSubmitCheckbox = {};
    const updateButtonLabel = jest.fn();
    const emitPayload = jest.fn();

    emitCaptureState(
      {
        dom,
        button,
        textInput,
        autoSubmitCheckbox,
        updateButtonLabel,
        emitPayload,
      },
      true
    );

    expect(updateButtonLabel).toHaveBeenCalledWith(dom, button, true);
    expect(emitPayload).toHaveBeenCalledWith(
      { dom, textInput, autoSubmitCheckbox },
      { type: 'capture', capturing: true }
    );
  });

  it('emits the inactive capture state without changing its boolean value', () => {
    const updateButtonLabel = jest.fn();
    const emitPayload = jest.fn();
    const options = {
      dom: {},
      button: {},
      textInput: {},
      autoSubmitCheckbox: null,
      updateButtonLabel,
      emitPayload,
    };

    emitCaptureState(options, false);

    expect(updateButtonLabel).toHaveBeenCalledWith(
      options.dom,
      options.button,
      false
    );
    expect(emitPayload).toHaveBeenCalledWith(
      {
        dom: options.dom,
        textInput: options.textInput,
        autoSubmitCheckbox: null,
      },
      { type: 'capture', capturing: false }
    );
  });
});
