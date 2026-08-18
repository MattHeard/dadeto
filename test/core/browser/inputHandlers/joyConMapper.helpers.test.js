import { describe, expect, it, jest } from '@jest/globals';
import { joyConMapperTestOnly } from '../../../../src/core/browser/inputHandlers/joyConMapper.js';

const {
  getClosestArticle,
  getAutoSubmitCheckbox,
  dispatchChangeEvent,
  enableAutoSubmit,
  syncToyInput,
  currentPad,
  currentHidSnapshot,
  currentControllerSnapshot,
  hasConnectedController,
  initializeWebHidCapture,
  requestAndOpenJoyConDevices,
  openGrantedJoyConDevice,
  attachHidDeviceListener,
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
  isMissingButtonSnapshots,
  hasAxisSnapshots,
  detectCurrentControlCapture,
} = joyConMapperTestOnly;

describe('joyConMapper helper branches', () => {
  it('finds the containing article entry', () => {
    const article = {};
    const container = {
      closest: selector => {
        expect(selector).toBe('article.entry');
        return article;
      },
    };

    expect(getClosestArticle(container)).toBe(article);
    expect(getClosestArticle({ closest: () => null })).toBeNull();
  });

  it('finds the article auto-submit checkbox when available', () => {
    const checkbox = {};
    const article = {};
    const container = { closest: () => article };
    const dom = {
      querySelector: (parent, selector) => {
        expect(parent).toBe(article);
        expect(selector).toBe('.auto-submit-checkbox');
        return checkbox;
      },
    };

    expect(getAutoSubmitCheckbox(container, dom)).toBe(checkbox);
    expect(getAutoSubmitCheckbox({ closest: () => null }, dom)).toBeNull();
  });

  it('dispatches change and enables auto-submit when requested', () => {
    const events = [];
    const checkbox = {
      checked: false,
      dispatchEvent: event => events.push(event.type),
    };

    dispatchChangeEvent(checkbox);
    expect(events).toEqual(['change']);

    enableAutoSubmit(checkbox);
    expect(checkbox.checked).toBe(true);
    expect(events).toEqual(['change', 'change']);
    enableAutoSubmit(null);
  });

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
          mappings: Object.fromEntries(
            [
              'l',
              'zl',
              'minus',
              'capture',
              'stick_press',
              'dpad_up',
              'dpad_down',
              'dpad_left',
              'dpad_right',
              'stick_left',
              'stick_right',
              'stick_up',
              'stick_down',
            ].map(key => [key, {}])
          ),
          skippedControls: [],
        },
      })
    ).toBe(13);

    expect(getSkippedControlKey(null)).toBeNull();
    expect(getSkippedControlKey({ key: 'zl' })).toBe('zl');
    expect(isMissingButtonSnapshots(null, null)).toBe(true);
    expect(isMissingButtonSnapshots({ buttons: [] }, null)).toBe(true);
    expect(hasAxisSnapshots(null, null)).toBe(false);
    expect(hasAxisSnapshots({ buttons: [] }, { buttons: [] })).toBe(true);
    expect(
      detectCurrentControlCapture(
        { currentControl: null, previousSnapshot: null },
        null
      )
    ).toBeNull();
  });
});

describe('joyConMapper input synchronization', () => {
  it('serializes and synchronizes toy input before auto-submit', () => {
    const textInput = { value: '' };
    const values = [];
    const checkbox = {
      checked: false,
      dispatchEvent: event => values.push(event.type),
    };
    const dom = {
      setValue: (element, value) => {
        expect(element).toBe(textInput);
        element.value = value;
        values.push(value);
      },
    };

    syncToyInput({
      dom,
      textInput,
      autoSubmitCheckbox: checkbox,
      payload: { answer: 42 },
    });

    expect(values).toEqual(['{"answer":42}', 'change']);
    expect(textInput.value).toBe('{"answer":42}');
    expect(checkbox.checked).toBe(true);
  });
});

describe('joyConMapper controller state helpers', () => {
  it('selects connected gamepads and controller snapshots', () => {
    const gamepad = { buttons: [{ pressed: true, value: 1 }], axes: [0.5] };
    const dom = { getGamepads: () => [null, gamepad] };
    const state = { dom, hidSnapshot: null, hidDevices: [] };

    expect(currentPad(dom)).toBe(gamepad);
    expect(currentHidSnapshot(state)).toBeNull();
    expect(currentControllerSnapshot(state)).toEqual({
      buttons: [{ pressed: true, value: 1 }],
      axes: [0.5],
    });
    expect(hasConnectedController(state)).toBe(true);
  });

  it('prefers HID snapshots and detects HID-only connections', () => {
    const hidSnapshot = { buttons: [], axes: [] };
    const state = {
      dom: { getGamepads: () => [] },
      hidSnapshot,
      hidDevices: [{}],
    };

    expect(currentHidSnapshot(state)).toBe(hidSnapshot);
    expect(currentControllerSnapshot(state)).toBe(hidSnapshot);
    expect(hasConnectedController(state)).toBe(true);
    expect(hasConnectedController({ ...state, hidDevices: [] })).toBe(false);
    expect(hasConnectedController({ dom: { getGamepads: () => [] } })).toBe(
      false
    );
  });
});

describe('joyConMapper WebHID availability', () => {
  it('ignores missing global browser APIs safely', () => {
    const state = { dom: {}, hidDevices: [] };
    const disposers = [];

    expect(() => initializeWebHidCapture(state, disposers)).not.toThrow();
    expect(disposers).toEqual([]);
  });

  it('ignores browsers without WebHID', () => {
    const state = { dom: { globalThis: { navigator: {} } }, hidDevices: [] };

    expect(() => initializeWebHidCapture(state, [])).not.toThrow();
  });

  it('ignores incomplete WebHID objects', () => {
    const state = {
      dom: { globalThis: { navigator: { hid: {} } } },
      hidDevices: [],
    };

    expect(() => initializeWebHidCapture(state, [])).not.toThrow();
  });

  it('loads available devices when WebHID is supported', async () => {
    const device = {};
    const getDevices = jest.fn(() => Promise.resolve([device]));
    const addEventListener = jest.fn();
    const removeEventListener = jest.fn();
    const state = {
      dom: {
        globalThis: {
          navigator: {
            hid: { getDevices, addEventListener, removeEventListener },
          },
        },
      },
      hidDevices: [],
    };
    const disposers = [];

    initializeWebHidCapture(state, disposers);
    await Promise.resolve();

    expect(getDevices).toHaveBeenCalledTimes(1);
    expect(addEventListener).toHaveBeenNthCalledWith(
      1,
      'connect',
      expect.any(Function)
    );
    expect(addEventListener).toHaveBeenNthCalledWith(
      2,
      'disconnect',
      expect.any(Function)
    );
    expect(disposers).toHaveLength(2);
    disposers.forEach(dispose => dispose());
    expect(removeEventListener).toHaveBeenNthCalledWith(
      1,
      'connect',
      expect.any(Function)
    );
    expect(removeEventListener).toHaveBeenNthCalledWith(
      2,
      'disconnect',
      expect.any(Function)
    );
    expect(state.hidDevices).toEqual([device]);
  });

  it('loads devices without requiring event-listener support', async () => {
    const getDevices = jest.fn(() => Promise.resolve([]));
    const state = {
      dom: { globalThis: { navigator: { hid: { getDevices } } } },
      hidDevices: [],
    };

    expect(() => initializeWebHidCapture(state, [])).not.toThrow();
    await Promise.resolve();
    expect(getDevices).toHaveBeenCalledTimes(1);
  });

  it('allows listener cleanup APIs to be absent', () => {
    const hid = {
      getDevices: () => Promise.resolve([]),
      addEventListener: () => {},
    };
    const state = {
      dom: { globalThis: { navigator: { hid } } },
      hidDevices: [],
    };
    const disposers = [];

    initializeWebHidCapture(state, disposers);
    expect(disposers).toHaveLength(2);
    expect(() => disposers.forEach(dispose => dispose())).not.toThrow();
  });
});

describe('joyConMapper Joy-Con device requests', () => {
  it('ignores missing request APIs safely', async () => {
    await expect(
      requestAndOpenJoyConDevices({ dom: {}, hidDevices: [] }, [])
    ).resolves.toBeUndefined();
    await expect(
      requestAndOpenJoyConDevices(
        { dom: { globalThis: { navigator: {} } }, hidDevices: [] },
        []
      )
    ).resolves.toBeUndefined();
    await expect(
      requestAndOpenJoyConDevices(
        { dom: { globalThis: { navigator: { hid: {} } } }, hidDevices: [] },
        []
      )
    ).resolves.toBeUndefined();
  });

  it('requests Joy-Con devices with the supported API', async () => {
    const requestDevice = jest.fn(() => Promise.resolve([]));
    const state = {
      dom: {
        globalThis: { navigator: { hid: { requestDevice } } },
        setTextContent: jest.fn(),
        getGamepads: () => [],
      },
      hidDevices: [],
      prompt: {},
      subprompt: {},
      dot: { classList: { toggle: jest.fn() } },
      statusText: {},
      metaIndex: {},
      metaId: {},
    };

    await requestAndOpenJoyConDevices(state, []);

    expect(requestDevice).toHaveBeenCalledWith({
      filters: [
        { vendorId: 0x057e, productId: 0x2006 },
        { vendorId: 0x057e, productId: 0x2007 },
        { vendorId: 0x057e, productId: 0x2008 },
        { vendorId: 0x057e, productId: 0x2009 },
      ],
    });
  });
});

describe('joyConMapper granted-device opening', () => {
  it('ignores null devices and opens new devices once', async () => {
    const open = jest.fn(() => Promise.resolve());
    const device = { open, opened: false };
    const state = { hidDevices: [] };

    await openGrantedJoyConDevice(state, [], null);
    await openGrantedJoyConDevice(state, [], device);

    expect(open).toHaveBeenCalledTimes(1);
    expect(state.hidDevices).toEqual([device]);
  });

  it('does not reopen or duplicate an already tracked device', async () => {
    const open = jest.fn(() => Promise.resolve());
    const device = { open, opened: true };
    const state = { hidDevices: [device] };

    await openGrantedJoyConDevice(state, [], device);

    expect(open).not.toHaveBeenCalled();
    expect(state.hidDevices).toEqual([device]);
  });

  it('does not reopen an already-open device with an open method', async () => {
    const open = jest.fn(() => Promise.resolve());
    const device = { open, opened: true };

    await openGrantedJoyConDevice({ hidDevices: [] }, [], device);

    expect(open).not.toHaveBeenCalled();
  });

  it('tracks devices that do not expose an open method', async () => {
    const device = { opened: false };
    const state = { hidDevices: [] };

    await openGrantedJoyConDevice(state, [], device);

    expect(state.hidDevices).toEqual([device]);
  });

  it('does not add an unopened device twice', async () => {
    const device = { opened: false };
    const state = { hidDevices: [device] };

    await openGrantedJoyConDevice(state, [], device);

    expect(state.hidDevices).toHaveLength(1);
  });

  it('skips listener attachment when a device lacks the API', () => {
    expect(() => attachHidDeviceListener({}, [], {})).not.toThrow();
  });

  it('attaches and cleans up input-report listeners', () => {
    const addEventListener = jest.fn();
    const removeEventListener = jest.fn();
    const device = { addEventListener, removeEventListener };
    const disposers = [];

    attachHidDeviceListener({}, disposers, device);

    expect(addEventListener).toHaveBeenCalledWith(
      'inputreport',
      expect.any(Function)
    );
    expect(disposers).toHaveLength(1);
    disposers[0]();
    expect(removeEventListener).toHaveBeenCalledWith(
      'inputreport',
      expect.any(Function)
    );
  });
});
