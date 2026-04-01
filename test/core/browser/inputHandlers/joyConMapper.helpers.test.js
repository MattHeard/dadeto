import { describe, expect, it } from '@jest/globals';
import { joyConMapperTestOnly } from '../../../../src/core/browser/inputHandlers/joyConMapper.js';

const {
  describeCapture,
  normalizeStoredMapperState,
  detectButtonCapture,
  detectAxisCapture,
  axisMatchesDirection,
  directionalDelta,
  hasAxisCaptureDelta,
  getAxisCaptureCandidate,
  selectStrongerButtonCapture,
  selectStrongerAxisCapture,
  attachCurrentControlKey,
  getCurrentControlKey,
  getPendingRowState,
  getRowState,
  getRowValueText,
  getGamepadStatusText,
  getGamepadIndexText,
  getGamepadIdText,
  normalizePendingIndex,
  getRefreshedCurrentIndex,
  getSkippedControlKey,
} = joyConMapperTestOnly;

describe('joyConMapper helper branches', () => {
  it('describes optional, button, and axis captures', () => {
    expect(describeCapture(null)).toBe('optional');
    expect(describeCapture({ type: 'button', index: 2, value: 0.9 })).toBe(
      'button 2'
    );
    expect(
      describeCapture({
        type: 'axis',
        axis: 1,
        direction: 'positive',
        magnitude: 0.9,
      })
    ).toBe('axis 1 +');
    expect(
      describeCapture({
        type: 'axis',
        axis: 1,
        direction: 'negative',
        magnitude: 0.9,
      })
    ).toBe('axis 1 -');
  });

  it('normalizes invalid and valid stored mapper states', () => {
    expect(normalizeStoredMapperState(undefined)).toEqual({
      mappings: {},
      skippedControls: [],
    });

    const stored = normalizeStoredMapperState({
      mappings: { l: { type: 'button', index: 0, value: 1 } },
      skippedControls: ['zr'],
    });

    expect(stored.mappings.l).toEqual({ type: 'button', index: 0, value: 1 });
    expect(stored.skippedControls).toEqual(['zr']);
  });

  it('detects button capture transitions and picks the strongest candidate', () => {
    const previous = {
      buttons: [
        { pressed: false, value: 0.2 },
        { pressed: false, value: 0.2 },
      ],
      axes: [0, 0],
    };
    const current = {
      buttons: [
        { pressed: true, value: 0.66 },
        { pressed: true, value: 0.95 },
      ],
      axes: [0, 0],
    };

    expect(detectButtonCapture(null, current)).toBeNull();
    expect(detectButtonCapture(previous, null)).toBeNull();
    expect(detectButtonCapture(previous, current)).toEqual({
      type: 'button',
      index: 1,
      value: 0.95,
    });

    expect(selectStrongerButtonCapture(null, null)).toBeNull();
  });

  it('detects axis captures for both directions and rejects weak deltas', () => {
    const previous = { buttons: [], axes: [0, 0.4] };
    const current = { buttons: [], axes: [0.8, 0.65] };

    expect(detectAxisCapture(null, current, 'positive')).toBeNull();
    expect(detectAxisCapture(previous, current, 'positive')).toEqual({
      type: 'axis',
      axis: 0,
      direction: 'positive',
      magnitude: 0.8,
    });

    const prevNegative = { buttons: [], axes: [0] };
    const currNegative = { buttons: [], axes: [-0.9] };

    expect(detectAxisCapture(prevNegative, currNegative, 'negative')).toEqual({
      type: 'axis',
      axis: 0,
      direction: 'negative',
      magnitude: 0.9,
    });

    expect(axisMatchesDirection(0.7, 'positive')).toBe(true);
    expect(axisMatchesDirection(-0.7, 'negative')).toBe(true);
    expect(directionalDelta(-0.3, 'negative')).toBe(0.3);
    expect(hasAxisCaptureDelta(0.7, 0.8, 'positive')).toBe(false);

    expect(
      getAxisCaptureCandidate(0.2, 0, {
        oldValue: 0,
        expectedDirection: 'positive',
      })
    ).toBeNull();

    expect(
      selectStrongerAxisCapture(
        { type: 'axis', axis: 0, direction: 'positive', magnitude: 0.6 },
        { type: 'axis', axis: 1, direction: 'positive', magnitude: 0.8 }
      )
    ).toEqual({ type: 'axis', axis: 1, direction: 'positive', magnitude: 0.8 });

    expect(
      detectAxisCapture(
        { buttons: [], axes: [] },
        { buttons: [], axes: [0.9] },
        'positive'
      )
    ).toEqual({
      type: 'axis',
      axis: 0,
      direction: 'positive',
      magnitude: 0.9,
    });
  });

  it('builds payload control keys and derives row state text', () => {
    const state = {
      started: true,
      currentIndex: 0,
      currentControl: { key: 'l', type: 'button' },
      stored: { mappings: {}, skippedControls: [] },
    };

    expect(getCurrentControlKey({ ...state, currentControl: null })).toBeNull();
    expect(attachCurrentControlKey({ action: 'noop' }, state)).toEqual({
      action: 'noop',
      currentControlKey: 'l',
    });

    expect(getPendingRowState({ ...state, started: false }, 0)).toBe(
      'optional'
    );
    expect(getPendingRowState(state, 0)).toBe('active');

    const control = { key: 'l', label: 'L', type: 'button' };
    expect(getRowState(control, state, 0)).toBe('active');

    const mappedState = {
      ...state,
      stored: {
        mappings: { l: { type: 'button', index: 4, value: 0.9 } },
        skippedControls: [],
      },
    };
    expect(getRowState(control, mappedState, 0)).toBe('done');
    expect(getRowValueText(control, mappedState, 0)).toBe('button 4');
  });

  it('covers status/meta formatting and index normalization helpers', () => {
    expect(getGamepadStatusText(null)).toBe('Waiting for gamepad');
    expect(getGamepadStatusText({})).toBe('Gamepad detected');
    expect(getGamepadIndexText(null)).toBe('Index: -');
    expect(getGamepadIndexText({ index: 7 })).toBe('Index: 7');
    expect(getGamepadIdText(null)).toBe('ID: -');
    expect(getGamepadIdText({ id: 'Pad X' })).toBe('ID: Pad X');

    expect(normalizePendingIndex(-1)).toBe(13);
    expect(normalizePendingIndex(3)).toBe(3);

    expect(getRefreshedCurrentIndex({ started: true, currentIndex: 8 })).toBe(
      8
    );
    expect(
      getRefreshedCurrentIndex({
        started: false,
        currentIndex: 0,
        stored: {
          mappings: {
            l: {},
            zl: {},
            minus: {},
            capture: {},
            stick_press: {},
            dpad_up: {},
            dpad_down: {},
            dpad_left: {},
            dpad_right: {},
            stick_left: {},
            stick_right: {},
            stick_up: {},
            stick_down: {},
          },
          skippedControls: [],
        },
      })
    ).toBe(13);

    expect(getSkippedControlKey(null)).toBeNull();
    expect(getSkippedControlKey({ key: 'zl' })).toBe('zl');
  });
});
