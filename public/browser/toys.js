import { createToysHandle } from '../core/browser/toys.js';

const handle = createToysHandle();

export const {
  convertArrayToKeyValueObject, parseExistingRows, clearDisposers,
  createDispose, createAddDropdownListener, ensureKeyValueInput, handleKVType,
  kvHandler, createInputDropdownHandler, getComponentInitializer,
  handleDropdownChange, createOutputDropdownHandler, handleModuleError,
  getModuleInitializer, makeModuleConfig, makeObserverCallback,
  makeCreateIntersectionObserver, enableInteractiveControls, getText,
  makeDisplayBody, getFetchErrorHandler, handleRequestResponse,
  createKeyInputHandler, createValueInputHandler, createKeyElement,
  createValueElement, createTypeToggleButton, createTypeElement,
  createOnAddHandler, createOnRemove, setupAddButton, setupRemoveButton,
  createKeyValueRow, isValidParsedRequest, handleParsedResult,
  parseJSONResult, processInputAndSetOutput, createHandleSubmit,
  initializeInteractiveComponent, initializeVisibleComponents, coerceValue,
  syncHiddenField, createRenderer, createDropdownInitializer, getDeepStateCopy,
} = handle;

export { handle };
