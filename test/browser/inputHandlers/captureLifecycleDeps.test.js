import { describe, expect, it } from '@jest/globals';
import captureLifecycleDeps, {
  createCaptureLifecycleDeps,
} from '../../../src/core/browser/inputHandlers/captureLifecycleDeps.js';
import * as captureFormShared from '../../../src/core/browser/inputHandlers/captureFormShared.js';
import { emitCaptureState } from '../../../src/core/browser/inputHandlers/captureLifecycleShared.js';
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
});
