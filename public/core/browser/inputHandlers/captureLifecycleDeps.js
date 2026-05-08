import * as captureFormShared from './captureFormShared.js';
import { emitCaptureState } from './captureLifecycleShared.js';
import { createCaptureLifecycleToggleHandler } from './captureLifecycleToggle.js';

export const captureLifecycleDeps = {
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

export const createCaptureLifecycleDeps = () => captureLifecycleDeps;
export default captureLifecycleDeps;
