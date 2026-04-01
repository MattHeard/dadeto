import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { initializeInteractiveComponent } from '../../src/browser/toys.js';

const createAutoSubmitContext = ({ includeAutoSubmit = true } = {}) => {
  const inputElement = { value: 'test', disabled: false };
  const submitButton = { disabled: false };
  const outputParent = {
    classList: { remove: jest.fn() },
    removeChild: jest.fn(),
    appendChild: jest.fn(),
  };
  const outputSelect = { value: 'text' };
  const autoSubmitCheckbox = includeAutoSubmit
    ? { checked: false, disabled: true }
    : undefined;

  const selectors = new Map([
    ['input[type="text"]', inputElement],
    ['button[type="submit"]', submitButton],
    ['div.output', outputParent],
    ['select.output', outputSelect],
  ]);
  if (includeAutoSubmit && autoSubmitCheckbox) {
    selectors.set('.auto-submit-checkbox', autoSubmitCheckbox);
  }

  const addedListeners = [];
  const dom = {
    removeAllChildren: jest.fn(),
    createElement: jest.fn(() => ({ textContent: '' })),
    setTextContent: jest.fn(),
    appendChild: jest.fn(),
    removeChild: jest.fn(),
    stopDefault: jest.fn(),
    addWarning: jest.fn(),
    addWarningFn: jest.fn(),
    querySelector: jest.fn((el, selector) => selectors.get(selector)),
    addEventListener: jest.fn((element, event, handler) => {
      addedListeners.push({ element, event, handler });
    }),
    removeWarning: jest.fn(),
    enable: jest.fn(),
    contains: () => true,
    removeEventListener: jest.fn(),
    getValue: jest.fn(element => element.value),
  };

  const config = {
    globalState: {},
    createEnvFn: () => ({
      output: {},
      data: {},
    }),
    errorFn: jest.fn(),
    fetchFn: jest.fn(),
    dom,
    getUuid: jest.fn(() => 'uuid-1'),
    loggers: {
      logInfo: jest.fn(),
      logError: jest.fn(),
      logWarning: jest.fn(),
    },
  };

  return {
    dom,
    config,
    autoSubmitCheckbox,
    addedListeners,
    inputElement,
    submitButton,
  };
};

describe('initializeInteractiveComponent auto submit checkbox', () => {
  const article = { id: 'auto-test' };
  const createProcessingFunction = () => jest.fn(() => 'result');

  let nextFrameId;
  let scheduledFrames;
  let cancelledFrames;
  let nextTimeoutId;
  let scheduledTimeouts;
  let clearedTimeouts;

  beforeEach(() => {
    nextFrameId = 1;
    scheduledFrames = [];
    cancelledFrames = [];
    nextTimeoutId = 1;
    scheduledTimeouts = [];
    clearedTimeouts = [];
  });

  const createTimerDom = ({ useAnimationFrame = true } = {}) => {
    const timerDom = {
      setTimeout: jest.fn(callback => {
        const timeout = { id: nextTimeoutId++, callback };
        scheduledTimeouts.push(timeout);
        return timeout.id;
      }),
      clearTimeout: jest.fn(timeoutId => {
        clearedTimeouts.push(timeoutId);
      }),
    };

    if (useAnimationFrame) {
      timerDom.requestAnimationFrame = jest.fn(callback => {
        const frame = { id: nextFrameId++, callback };
        scheduledFrames.push(frame);
        return frame.id;
      });
      timerDom.cancelAnimationFrame = jest.fn(frameId => {
        cancelledFrames.push(frameId);
      });
    }

    return timerDom;
  };

  const createTimerContext = (options = {}) => {
    const timerDom = createTimerDom(options);
    const context = createAutoSubmitContext({
      includeAutoSubmit: true,
    });
    context.config.dom = { ...context.config.dom, ...timerDom };
    return { ...context, timerDom };
  };

  it('starts and stops requestAnimationFrame polling for auto submit', () => {
    const {
      config,
      autoSubmitCheckbox,
      addedListeners,
      inputElement,
      timerDom,
    } = createTimerContext();
    const processingFunction = createProcessingFunction();

    initializeInteractiveComponent(article, processingFunction, config);

    const changeListener = addedListeners.find(
      entry => entry.element === autoSubmitCheckbox && entry.event === 'change'
    );
    expect(changeListener).toBeDefined();
    expect(config.dom.enable).toHaveBeenCalledWith(autoSubmitCheckbox);

    const initialInputListeners = addedListeners.filter(
      entry => entry.element === inputElement && entry.event === 'input'
    );
    expect(initialInputListeners).toHaveLength(1);
    expect(timerDom.requestAnimationFrame).not.toHaveBeenCalled();

    autoSubmitCheckbox.checked = true;
    changeListener.handler();

    expect(timerDom.requestAnimationFrame).toHaveBeenCalledTimes(1);
    expect(cancelledFrames).toHaveLength(0);

    autoSubmitCheckbox.checked = false;
    changeListener.handler();

    expect(cancelledFrames).toEqual([1]);
  });

  it('does not register a second polling loop when already auto submitting', () => {
    const { config, autoSubmitCheckbox, addedListeners, timerDom } =
      createTimerContext();
    const processingFunction = createProcessingFunction();

    initializeInteractiveComponent(article, processingFunction, config);

    const changeListener = addedListeners.find(
      entry => entry.element === autoSubmitCheckbox && entry.event === 'change'
    );
    autoSubmitCheckbox.checked = true;
    changeListener.handler();

    const framesAfterFirstToggle = scheduledFrames.length;

    changeListener.handler();

    expect(scheduledFrames).toHaveLength(framesAfterFirstToggle);
    expect(timerDom.cancelAnimationFrame).not.toHaveBeenCalled();
  });

  it('submits when the polled input value changes', () => {
    const {
      config,
      autoSubmitCheckbox,
      addedListeners,
      inputElement,
      timerDom,
    } = createTimerContext();
    const processingFunction = createProcessingFunction();

    initializeInteractiveComponent(article, processingFunction, config);

    const changeListener = addedListeners.find(
      entry => entry.element === autoSubmitCheckbox && entry.event === 'change'
    );
    autoSubmitCheckbox.checked = true;
    changeListener.handler();

    const firstFrame = scheduledFrames[0];
    inputElement.value = 'updated';
    firstFrame.callback(16);

    expect(processingFunction).toHaveBeenCalledWith(
      'updated',
      expect.objectContaining({
        output: {},
        data: {},
      })
    );
    expect(timerDom.requestAnimationFrame).toHaveBeenCalledTimes(2);
  });

  it('does not submit when the polled input value is unchanged', () => {
    const { config, autoSubmitCheckbox, addedListeners, timerDom } =
      createTimerContext();
    const processingFunction = createProcessingFunction();

    initializeInteractiveComponent(article, processingFunction, config);

    const changeListener = addedListeners.find(
      entry => entry.element === autoSubmitCheckbox && entry.event === 'change'
    );
    autoSubmitCheckbox.checked = true;
    changeListener.handler();

    scheduledFrames[0].callback(16);

    expect(processingFunction).not.toHaveBeenCalled();
    expect(timerDom.requestAnimationFrame).toHaveBeenCalledTimes(2);
  });

  it('falls back to setTimeout when requestAnimationFrame is unavailable', () => {
    const {
      config,
      autoSubmitCheckbox,
      addedListeners,
      inputElement,
      timerDom,
    } = createTimerContext({ useAnimationFrame: false });
    const processingFunction = createProcessingFunction();

    initializeInteractiveComponent(article, processingFunction, config);

    const changeListener = addedListeners.find(
      entry => entry.element === autoSubmitCheckbox && entry.event === 'change'
    );

    autoSubmitCheckbox.checked = true;
    changeListener.handler();

    expect(timerDom.setTimeout).toHaveBeenCalledTimes(1);
    expect(scheduledTimeouts).toHaveLength(1);
    expect(scheduledFrames).toHaveLength(0);

    const timeout = scheduledTimeouts[0];
    inputElement.value = 'fallback-update';
    timeout.callback();

    expect(processingFunction).toHaveBeenCalledWith(
      'fallback-update',
      expect.objectContaining({
        output: {},
        data: {},
      })
    );
    expect(timerDom.setTimeout).toHaveBeenCalledTimes(2);

    const activeTimeout = scheduledTimeouts[1];
    autoSubmitCheckbox.checked = false;
    changeListener.handler();

    expect(timerDom.clearTimeout).toHaveBeenCalledWith(activeTimeout.id);
    expect(clearedTimeouts).toEqual([activeTimeout.id]);
  });

  it('skips auto submit wiring when no checkbox exists', () => {
    const { config, addedListeners, inputElement, submitButton } =
      createAutoSubmitContext({ includeAutoSubmit: false });
    const processingFunction = createProcessingFunction();

    initializeInteractiveComponent(article, processingFunction, config);

    const changeListeners = addedListeners.filter(
      entry => entry.event === 'change'
    );
    expect(changeListeners).toHaveLength(0);

    expect(config.dom.enable.mock.calls).toEqual([
      [inputElement],
      [submitButton],
    ]);
  });
});
