import { describe, expect, it, jest } from '@jest/globals';
import { joyConMapperTestOnly } from '../../../../src/core/browser/inputHandlers/joyConMapper.js';

const {
  createElement,
  applyCreatedElementOptions,
  applyElementClassName,
  applyElementText,
  readStoredMapperState,
  normalizeStoredMappings,
  normalizeSkippedControls,
  attachCurrentControlKey,
  crossedButtonThreshold,
  hasButtonCaptureTransition,
  makeButtonCaptureReducer,
  getButtonCaptureCandidate,
  pickStrongerButtonCapture,
  mergeAxisCaptureCandidate,
  getRowState,
  isPromptComplete,
  getStartedPromptCopy,
  getConnectedPromptCopy,
  getActivePromptText,
  ensureStarted,
  advanceToNextControl,
  isPendingControlAfterIndex,
  captureCurrentControl,
  shouldSkipCapture,
  updateCaptureState,
  detectCurrentControlCapture,
} = joyConMapperTestOnly;

/**
 * Build a minimal DOM helper bundle for the Joy-Con mapper coverage tests.
 * @returns {object} Minimal DOM helper bundle.
 */
function createDom() {
  return {
    globalThis: {
      localStorage: {
        getItem: jest.fn(),
      },
    },
    createElement: jest.fn(tag => ({
      tagName: tag,
      classList: { add: jest.fn() },
    })),
    setClassName: jest.fn((element, className) => {
      element.className = className;
    }),
    setTextContent: jest.fn((element, text) => {
      element.textContent = text;
    }),
    setValue: jest.fn((element, value) => {
      element.value = value;
    }),
    appendChild: jest.fn(),
    removeAllChildren: jest.fn(),
    setInterval: jest.fn(() => 1),
    clearInterval: jest.fn(),
    requestAnimationFrame: jest.fn(callback => callback()),
    querySelector: jest.fn(),
  };
}

describe('joyConMapper coverage helpers', () => {
  it('covers element construction and option fallbacks', () => {
    const dom = createDom();

    const created = createElement(dom, 'div');
    expect(created.tagName).toBe('div');
    expect(dom.createElement).toHaveBeenCalledWith('div');

    const element = {};
    applyCreatedElementOptions(dom, element, undefined);
    applyCreatedElementOptions(dom, element, {
      className: 'selected',
      text: 'Label',
    });
    applyElementClassName(dom, element, undefined);
    applyElementClassName(dom, element, 'active');
    applyElementText(dom, element, undefined);
    applyElementText(dom, element, 'Value');

    expect(dom.setClassName).toHaveBeenCalledWith(element, 'selected');
    expect(dom.setTextContent).toHaveBeenCalledWith(element, 'Value');
  });

  it('covers storage and policy normalization branches', () => {
    const dom = createDom();
    dom.globalThis.localStorage.getItem.mockImplementation(() => {
      throw new Error('boom');
    });

    expect(readStoredMapperState(dom)).toEqual({
      mappings: {},
      skippedControls: [],
    });
    expect(normalizeStoredMappings('x')).toEqual({});
    expect(normalizeSkippedControls('x')).toEqual([]);
  });

  it('covers button capture comparisons', () => {
    const weak = { type: 'button', index: 1, value: 0.3 };
    const strong = { type: 'button', index: 2, value: 0.9 };
    const previous = { buttons: [{ pressed: false, value: 0.2 }], axes: [] };
    const current = {
      buttons: [
        { pressed: true, value: 0.7 },
        { pressed: false, value: 0.8 },
      ],
      axes: [],
    };

    expect(
      crossedButtonThreshold(
        { pressed: false, value: 0.7 },
        { pressed: false, value: 0.2 }
      )
    ).toBe(true);
    expect(
      crossedButtonThreshold(
        { pressed: false, value: 0.4 },
        { pressed: false, value: 0.2 }
      )
    ).toBe(false);
    expect(
      hasButtonCaptureTransition(
        { pressed: true, value: 0.7 },
        { pressed: false, value: 0.2 }
      )
    ).toBe(true);
    expect(
      hasButtonCaptureTransition(
        { pressed: false, value: 0.7 },
        { pressed: false, value: 0.2 }
      )
    ).toBe(true);
    expect(
      getButtonCaptureCandidate(
        { pressed: false, value: 0.2 },
        { pressed: false, value: 0.2 },
        0
      )
    ).toBeNull();
    expect(pickStrongerButtonCapture(strong, weak)).toBe(strong);
    expect(pickStrongerButtonCapture(weak, strong)).toBe(strong);
    expect(
      makeButtonCaptureReducer(previous)(
        { type: 'button', index: 0, value: 0.2 },
        current.buttons[1],
        1
      )
    ).toEqual({ type: 'button', index: 1, value: 0.8 });
  });

  it('covers axis and prompt branches', () => {
    expect(mergeAxisCaptureCandidate(null, null)).toBeNull();
    expect(getActivePromptText({ type: 'button' })).toContain(
      'newly pressed gamepad button'
    );
    expect(getActivePromptText({ type: 'axis' })).toContain('Move the stick');
    expect(isPromptComplete({ currentIndex: 13, currentControl: null })).toBe(
      true
    );
    expect(
      getStartedPromptCopy({ currentIndex: 13, currentControl: null })
    ).toEqual({
      prompt: 'Mapping complete',
      subprompt:
        'The saved mapping is persisted locally and shown in the output panel.',
    });
    expect(getConnectedPromptCopy({ started: false })).toEqual({
      prompt: 'Ready to map the left Joy-Con',
      subprompt:
        'Press Start Mapping. Every control is optional and can be skipped.',
    });
    expect(
      getConnectedPromptCopy({
        started: true,
        currentIndex: 0,
        currentControl: null,
      })
    ).toEqual({
      prompt: 'Mapping complete',
      subprompt:
        'The saved mapping is persisted locally and shown in the output panel.',
    });
  });

  it('covers capture guards and row-state branches', () => {
    const control = { key: 'zl', label: 'ZL', type: 'button' };
    const skippedState = {
      started: true,
      currentIndex: 0,
      currentControl: control,
      stored: { mappings: {}, skippedControls: ['zl'] },
    };
    const activeState = {
      ...skippedState,
      stored: { mappings: {}, skippedControls: [] },
    };

    expect(
      attachCurrentControlKey(
        { action: 'noop' },
        { ...activeState, currentControl: null }
      )
    ).toEqual({
      action: 'noop',
    });
    expect(getRowState(control, skippedState, 0)).toBe('skipped');
    const nextState = { started: false };
    ensureStarted(nextState);
    expect(nextState.started).toBe(true);
    const alreadyStarted = { started: true };
    ensureStarted(alreadyStarted);
    expect(alreadyStarted.started).toBe(true);
    expect(
      isPendingControlAfterIndex(
        { currentIndex: 0, stored: { mappings: {}, skippedControls: [] } },
        control,
        1
      )
    ).toBe(true);
    expect(
      isPendingControlAfterIndex(
        { currentIndex: 1, stored: { mappings: {}, skippedControls: [] } },
        control,
        0
      )
    ).toBe(false);
    expect(shouldSkipCapture({ started: false, currentControl: control })).toBe(
      true
    );
    expect(shouldSkipCapture({ started: true, currentControl: null })).toBe(
      true
    );
    expect(shouldSkipCapture(activeState)).toBe(false);
    expect(
      captureCurrentControl(
        { ...activeState, currentControl: null },
        { type: 'button', index: 0, value: 1 }
      )
    ).toBeUndefined();
    expect(
      updateCaptureState({ ...activeState, previousSnapshot: null }, null)
    ).toBeUndefined();
  });

  it('covers current-control detection branches', () => {
    expect(
      detectCurrentControlCapture(
        {
          currentControl: { type: 'button' },
          previousSnapshot: {
            buttons: [{ pressed: false, value: 0.2 }],
            axes: [],
          },
        },
        {
          buttons: [{ pressed: true, value: 0.8 }],
          axes: [],
        }
      )
    ).toEqual({ type: 'button', index: 0, value: 0.8 });

    expect(
      detectCurrentControlCapture(
        {
          currentControl: { type: 'axis', direction: 'positive' },
          previousSnapshot: { buttons: [], axes: [0] },
        },
        {
          buttons: [],
          axes: [0.6],
        }
      )
    ).toEqual({ type: 'axis', axis: 0, direction: 'positive', magnitude: 0.6 });
  });

  it('covers control advancement fallback', () => {
    const state = {
      currentIndex: 12,
      currentControl: { key: 'stick_down' },
      stored: { mappings: {}, skippedControls: [] },
    };

    advanceToNextControl(state);

    expect(state.currentIndex).toBe(13);
    expect(state.currentControl).toBeNull();
  });
});
