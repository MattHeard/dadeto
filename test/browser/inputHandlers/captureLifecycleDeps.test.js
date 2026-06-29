import { describe, expect, it, jest } from '@jest/globals';
import captureLifecycleDeps, {
  createCaptureLifecycleDeps,
} from '../../../src/core/browser/inputHandlers/captureLifecycleDeps.js';
import * as captureFormShared from '../../../src/core/browser/inputHandlers/captureFormShared.js';
import {
  emitCaptureState,
  updateCaptureButtonLabel,
} from '../../../src/core/browser/inputHandlers/captureLifecycleShared.js';
import { createCaptureLifecycleToggleHandler } from '../../../src/core/browser/inputHandlers/captureLifecycleToggle.js';

describe('captureLifecycleDeps', () => {
  it('wires the shared capture helpers together', () => {
    const expected = {
      getAutoSubmitCheckbox: captureFormShared.getAutoSubmitCheckbox,
      makeCaptureFormBuilder: captureFormShared.makeCaptureFormBuilder,
      prepareCaptureHandler: captureFormShared.prepareCaptureHandler,
      registerGlobalListener: captureFormShared.registerGlobalListener,
      syncToyInput: captureFormShared.syncToyInput,
      syncToyPayload: captureFormShared.syncToyPayload,
      withCaptureFormContext: captureFormShared.withCaptureFormContext,
      emitCaptureState,
      createCaptureLifecycleToggleHandler,
    };

    expect(createCaptureLifecycleDeps()).toStrictEqual(expected);
    expect(captureLifecycleDeps).toStrictEqual(expected);
  });

  it('updates the capture button label for the non-capturing state', () => {
    const dom = { setTextContent: jest.fn() };
    const button = {};

    updateCaptureButtonLabel({
      dom,
      button,
      isCapturing: false,
      captureLabel: 'Capture',
      releaseLabel: 'Release',
    });

    expect(dom.setTextContent).toHaveBeenCalledWith(button, 'Capture');
  });

  it('updates the capture button label for the capturing state', () => {
    const dom = { setTextContent: jest.fn() };
    const button = {};

    updateCaptureButtonLabel({
      dom,
      button,
      isCapturing: true,
      captureLabel: 'Capture',
      releaseLabel: 'Release',
    });

    expect(dom.setTextContent).toHaveBeenCalledWith(button, 'Release');
  });

  it('notifies the stop hook when capture is disabled', () => {
    const onStop = jest.fn();
    const handler = createCaptureLifecycleToggleHandler({
      dom: {},
      button: {},
      textInput: {},
      autoSubmitCheckbox: null,
      state: { capturing: true },
      updateButtonLabel: jest.fn(),
      emitPayload: jest.fn(),
      onStop,
    });

    handler();

    expect(onStop).toHaveBeenCalled();
  });

  it('notifies the start hook when capture is enabled', () => {
    const onStart = jest.fn();
    const handler = createCaptureLifecycleToggleHandler({
      dom: {},
      button: {},
      textInput: {},
      autoSubmitCheckbox: null,
      state: { capturing: false },
      updateButtonLabel: jest.fn(),
      emitPayload: jest.fn(),
      onStart,
    });

    handler();

    expect(onStart).toHaveBeenCalled();
  });
});
