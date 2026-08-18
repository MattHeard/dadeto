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
  updateHidSnapshot,
  sameHidSnapshot,
  sameButtonSnapshots,
  sameButtonSnapshot,
  sameNumberArray,
  snapshotHidInputReport,
  readJoyConButtonBytes,
  readJoyConHatByte,
  resolveHatXAxis,
  snapshotHidButtons,
  logHidDeviceEvent,
  logHidReportEvent,
  createElement,
  applyCreatedElementOptions,
  applyElementClassName,
  describeCapture,
  normalizeStoredMapperState,
  normalizeStoredMappings,
  normalizeSkippedControls,
  isObjectLike,
  isControlPending,
  firstPendingIndex,
  becamePressed,
  crossedButtonThreshold,
  hasButtonCaptureTransition,
  getButtonCaptureCandidate,
  selectCapturedButton,
  isStrongerButtonCapture,
  pickStrongerButtonCapture,
  readStoredMapperState,
  readStoredMapperRoot,
  parseStoredMapperRoot,
  readMapperStorageEntry,
  detectButtonCapture,
  detectAxisCapture,
  axisMatchesDirection,
  directionalDelta,
  hasAxisCaptureDelta,
  getAxisCaptureCandidate,
  mergeAxisCaptureCandidate,
  buildPayload,
  getStoredControlCapture,
  getPendingRowStateForStarted,
  selectStrongerButtonCapture,
  selectStrongerAxisCapture,
  attachCurrentControlKey,
  getCurrentControlKey,
  getPendingRowState,
  getRowState,
  getRowValueText,
  getDisconnectedPromptCopy,
  getReadyPromptCopy,
  getCompletePromptCopy,
  getActivePromptCopy,
  isPromptComplete,
  getStartedPromptCopy,
  getConnectedPromptCopy,
  renderPrompt,
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

    expect(isObjectLike(null)).toBe(false);
    expect(isObjectLike('text')).toBe(false);
    expect(isObjectLike({})).toBe(true);
    expect(normalizeStoredMappings('text')).toEqual({});
    expect(normalizeStoredMappings([])).toEqual([]);
    expect(normalizeSkippedControls({})).toEqual([]);
    expect(normalizeSkippedControls(['zr'])).toEqual(['zr']);
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

describe('joyConMapper HID snapshot stabilization', () => {
  it('promotes repeated snapshots and resets on changes', () => {
    const first = { buttons: [{ pressed: true, value: 1 }], axes: [0.2] };
    const changed = { buttons: [{ pressed: false, value: 0 }], axes: [0.2] };
    const state = {
      hidPendingSnapshot: null,
      hidPendingSnapshotCount: 0,
      hidSnapshot: null,
    };

    expect(sameHidSnapshot(first, first)).toBe(true);
    expect(sameHidSnapshot(first, changed)).toBe(false);
    expect(
      sameButtonSnapshot(
        { pressed: true, value: 1 },
        { pressed: true, value: 1 }
      )
    ).toBe(true);
    expect(
      sameButtonSnapshots(
        [{ pressed: true, value: 1 }],
        [{ pressed: false, value: 1 }]
      )
    ).toBe(false);
    expect(
      sameButtonSnapshots(
        [
          { pressed: true, value: 1 },
          { pressed: true, value: 0 },
        ],
        [
          { pressed: true, value: 1 },
          { pressed: false, value: 0 },
        ]
      )
    ).toBe(false);
    expect(sameButtonSnapshots([], [{ pressed: false, value: 0 }])).toBe(false);
    expect(sameNumberArray([0.1, 0.2], [0.1, 0.2])).toBe(true);
    expect(sameNumberArray([0.1], [0.1, 0.2])).toBe(false);
    expect(sameNumberArray([0.1], [0.2])).toBe(false);
    expect(sameNumberArray([0.1, 0.2], [0.1, 0.3])).toBe(false);
    updateHidSnapshot(state, first);
    expect(state.hidPendingSnapshot).toBe(first);
    expect(state.hidPendingSnapshotCount).toBe(1);
    expect(state.hidSnapshot).toBeNull();

    updateHidSnapshot(state, first);
    expect(state.hidPendingSnapshotCount).toBe(2);
    expect(state.hidSnapshot).toBe(first);

    updateHidSnapshot(state, changed);
    expect(state.hidPendingSnapshot).toBe(changed);
    expect(state.hidPendingSnapshotCount).toBe(1);
    expect(state.hidSnapshot).toBe(first);

    const thresholdState = {
      hidPendingSnapshot: first,
      hidPendingSnapshotCount: 0,
      hidSnapshot: null,
    };
    updateHidSnapshot(thresholdState, first);
    expect(thresholdState.hidPendingSnapshotCount).toBe(1);
    expect(thresholdState.hidSnapshot).toBeNull();
  });
});

describe('joyConMapper HID report snapshots', () => {
  it('returns an empty snapshot for an empty report', () => {
    expect(
      snapshotHidInputReport({ data: { buffer: new Uint8Array().buffer } })
    ).toEqual({ buttons: [], axes: [] });
  });

  it('decodes standard and fallback report layouts', () => {
    const standard = snapshotHidInputReport({
      reportId: 0x3f,
      data: { buffer: new Uint8Array([0x00, 0x01, 0x02, 0x00]).buffer },
    });
    const fallback = snapshotHidInputReport({
      data: { buffer: new Uint8Array([0x01, 0x02, 0x00]).buffer },
    });

    expect(standard.buttons).toHaveLength(16);
    expect(standard.axes).toHaveLength(2);
    expect(fallback.buttons).toHaveLength(16);
    expect(fallback.axes).toHaveLength(2);
    expect(readJoyConButtonBytes([9, 8, 7, 6], true)).toEqual([8, 7]);
    expect(readJoyConButtonBytes([9, 8, 7, 6], false)).toEqual([9, 8]);
    expect(readJoyConHatByte([9, 8, 7, 6], true)).toBe(6);
    expect(readJoyConHatByte([9, 8], false)).toBeNull();
    expect(readJoyConHatByte([9, 8, 7], false)).toBe(7);
    expect([5, 6, 7].map(resolveHatXAxis)).toEqual([-1, -1, -1]);
    expect([1, 2, 3].map(resolveHatXAxis)).toEqual([1, 1, 1]);
    expect([0, 4].map(resolveHatXAxis)).toEqual([0, 0]);
    expect(snapshotHidButtons([0])).toEqual(
      Array.from({ length: 8 }, () => ({ pressed: false, value: 0 }))
    );
    expect(snapshotHidButtons([1])[0]).toEqual({ pressed: true, value: 1 });
  });

  it('logs HID lifecycle events only when a device exists', () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});

    logHidDeviceEvent('connected', null);
    expect(log).not.toHaveBeenCalled();

    const device = {
      productName: 'Joy-Con',
      vendorId: 0x057e,
      productId: 0x2006,
    };
    logHidDeviceEvent('connected', device);
    expect(log).toHaveBeenCalledWith('[joyConMapper:webhid]', 'connected', {
      productName: 'Joy-Con',
      vendorId: 0x057e,
      productId: 0x2006,
      collections: 0,
      opened: undefined,
    });
    log.mockRestore();
  });

  it('logs HID report bytes with the report label', () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});

    logHidReportEvent(
      { productName: 'Joy-Con', vendorId: 0x057e, productId: 0x2006 },
      { data: { buffer: new Uint8Array([1, 2]).buffer } }
    );

    expect(log).toHaveBeenCalledWith('[joyConMapper:webhid]', 'report', {
      productName: 'Joy-Con',
      vendorId: 0x057e,
      productId: 0x2006,
      bytes: [1, 2],
    });
    log.mockRestore();
  });
});

describe('joyConMapper storage helpers', () => {
  it('reads mapper state from local storage and handles storage failures', () => {
    const stored = { mappings: { l: 'button' }, skippedControls: ['zr'] };
    const dom = {
      globalThis: {
        localStorage: {
          getItem: jest.fn(() => JSON.stringify({ JOYMAP1: stored })),
        },
      },
    };

    expect(readStoredMapperRoot(dom)).toEqual({ JOYMAP1: stored });
    expect(readStoredMapperRoot({ globalThis: {} })).toEqual({});
    expect(readMapperStorageEntry({ JOYMAP1: stored })).toBe(stored);
    expect(readMapperStorageEntry(null)).toBeUndefined();
    expect(readStoredMapperState(dom)).toEqual({
      mappings: { l: 'button' },
      skippedControls: ['zr'],
    });

    expect(parseStoredMapperRoot(undefined)).toEqual({});
    expect(parseStoredMapperRoot(null)).toEqual({});
    expect(() => parseStoredMapperRoot('')).toThrow(SyntaxError);
    expect(
      readStoredMapperState({
        globalThis: {
          localStorage: {
            getItem: () => {
              throw new Error('blocked');
            },
          },
        },
      })
    ).toEqual({ mappings: {}, skippedControls: [] });
  });
});

describe('joyConMapper pending-control helpers', () => {
  const control = { key: 'l' };

  it('distinguishes mapped, skipped, and pending controls', () => {
    expect(
      isControlPending(
        { stored: { mappings: {}, skippedControls: [] } },
        control
      )
    ).toBe(true);
    expect(
      isControlPending(
        {
          stored: { mappings: { l: { type: 'button' } }, skippedControls: [] },
        },
        control
      )
    ).toBe(false);
    expect(
      isControlPending(
        { stored: { mappings: {}, skippedControls: ['l'] } },
        control
      )
    ).toBe(false);
  });

  it('finds the first control that still needs mapping', () => {
    expect(
      firstPendingIndex({
        stored: { mappings: { l: {} }, skippedControls: [] },
      })
    ).toBe(1);
    expect(
      firstPendingIndex({
        stored: { mappings: {}, skippedControls: ['l', 'zl', 'minus'] },
      })
    ).toBe(3);
  });
});

describe('joyConMapper snapshot guard helpers', () => {
  it('checks every missing-snapshot combination', () => {
    expect(isMissingButtonSnapshots(null, { buttons: [] })).toBe(true);
    expect(isMissingButtonSnapshots({ buttons: [] }, { buttons: [] })).toBe(
      false
    );
  });
});

describe('joyConMapper button transition helpers', () => {
  it('detects press edges and threshold crossings independently', () => {
    const released = { pressed: false, value: 0.1 };
    const pressed = { pressed: true, value: 0.1 };
    const belowThreshold = { pressed: false, value: 0.54 };
    const atThreshold = { pressed: false, value: 0.65 };
    const aboveThreshold = { pressed: false, value: 0.8 };

    expect(becamePressed(pressed, released)).toBe(true);
    expect(becamePressed(released, pressed)).toBe(false);
    expect(crossedButtonThreshold(atThreshold, belowThreshold)).toBe(true);
    expect(crossedButtonThreshold(aboveThreshold, atThreshold)).toBe(false);
    expect(crossedButtonThreshold(belowThreshold, atThreshold)).toBe(false);
    expect(hasButtonCaptureTransition(pressed, released)).toBe(true);
    expect(hasButtonCaptureTransition(atThreshold, belowThreshold)).toBe(true);
    expect(hasButtonCaptureTransition(released, released)).toBe(false);
  });

  it('returns candidates only for qualifying transitions', () => {
    const released = { pressed: false, value: 0 };
    const pressed = { pressed: true, value: 0.8 };

    expect(getButtonCaptureCandidate(pressed, released, 4)).toEqual({
      type: 'button',
      index: 4,
      value: 0.8,
    });
    expect(getButtonCaptureCandidate(released, released, 4)).toBeNull();
  });
});

describe('joyConMapper button selection helpers', () => {
  const weaker = { type: 'button', index: 1, value: 0.7 };
  const equal = { type: 'button', index: 2, value: 0.7 };
  const stronger = { type: 'button', index: 3, value: 0.9 };

  it('selects candidates across null, stronger, weaker, and tie cases', () => {
    expect(selectStrongerButtonCapture(null, null)).toBeNull();
    expect(selectStrongerButtonCapture(null, weaker)).toBe(weaker);
    expect(selectStrongerButtonCapture(stronger, null)).toBe(stronger);
    expect(selectCapturedButton(null, weaker)).toBe(weaker);
    expect(selectCapturedButton(weaker, stronger)).toBe(stronger);
    expect(selectCapturedButton(stronger, weaker)).toBe(stronger);
    expect(selectCapturedButton(weaker, equal)).toBe(weaker);
    expect(isStrongerButtonCapture(stronger, weaker)).toBe(true);
    expect(isStrongerButtonCapture(equal, weaker)).toBe(false);
    expect(pickStrongerButtonCapture(stronger, weaker)).toBe(stronger);
    expect(pickStrongerButtonCapture(weaker, stronger)).toBe(stronger);
  });
});

describe('joyConMapper axis threshold helpers', () => {
  it('accepts exact positive and negative axis thresholds', () => {
    expect(axisMatchesDirection(0.55, 'positive')).toBe(true);
    expect(axisMatchesDirection(-0.55, 'negative')).toBe(true);
    expect(axisMatchesDirection(0.55, 'negative')).toBe(false);
  });
});

describe('joyConMapper axis snapshot helpers', () => {
  it('rejects either missing axis snapshot', () => {
    expect(hasAxisSnapshots(null, { buttons: [], axes: [] })).toBe(false);
    expect(hasAxisSnapshots({ buttons: [], axes: [] }, null)).toBe(false);
  });
});

describe('joyConMapper axis delta threshold helpers', () => {
  it('rejects exact positive and negative delta thresholds', () => {
    expect(hasAxisCaptureDelta(0, 0.18, 'positive')).toBe(false);
    expect(hasAxisCaptureDelta(0, -0.18, 'negative')).toBe(false);
  });
});

describe('joyConMapper axis selection helpers', () => {
  it('retains the existing capture when magnitudes tie', () => {
    const best = {
      type: 'axis',
      axis: 0,
      direction: 'positive',
      magnitude: 0.8,
    };
    const candidate = {
      type: 'axis',
      axis: 1,
      direction: 'positive',
      magnitude: 0.8,
    };

    expect(selectStrongerAxisCapture(best, candidate)).toBe(best);
    expect(mergeAxisCaptureCandidate(best, null)).toBe(best);
    expect(mergeAxisCaptureCandidate(null, candidate)).toBe(candidate);
  });
});

describe('joyConMapper payload helpers', () => {
  it('handles empty control keys and extra payload fields', () => {
    const state = {
      currentControl: { key: 'l' },
    };
    expect(
      attachCurrentControlKey(
        { action: 'noop' },
        { currentControl: { key: '' } }
      )
    ).toEqual({ action: 'noop' });
    expect(buildPayload('save', state, { value: 3 })).toEqual({
      action: 'save',
      value: 3,
      currentControlKey: 'l',
    });
  });
});

describe('joyConMapper stored-row helpers', () => {
  it('returns stored captures and started row states', () => {
    const control = { key: 'l' };
    const capture = { type: 'button', index: 2, value: 0.9 };
    expect(
      getStoredControlCapture(control, { stored: { mappings: { l: capture } } })
    ).toBe(capture);
    expect(
      getStoredControlCapture(control, { stored: { mappings: {} } })
    ).toBeNull();
    expect(getPendingRowStateForStarted({ currentIndex: 2 }, 2)).toBe('active');
    expect(getPendingRowStateForStarted({ currentIndex: 1 }, 2)).toBe(
      'optional'
    );
    expect(
      getPendingRowState({ started: true, currentIndex: 2 }, 2)
    ).toStrictEqual('active');
    expect(
      getPendingRowState({ started: true, currentIndex: 1 }, 2)
    ).toStrictEqual('optional');
  });
});

describe('joyConMapper skipped-row state', () => {
  it('marks a skipped unmapped control as skipped', () => {
    expect(
      getRowState(
        { key: 'l' },
        {
          started: true,
          currentIndex: 0,
          currentControl: null,
          stored: { mappings: {}, skippedControls: ['l'] },
        },
        0
      )
    ).toBe('skipped');
  });
});

describe('joyConMapper row-value fallback', () => {
  it('shows the active listening label when no capture is stored', () => {
    expect(
      getRowValueText(
        { key: 'l', label: 'L', type: 'button' },
        {
          started: true,
          currentIndex: 0,
          currentControl: { key: 'l', type: 'button' },
          stored: { mappings: {}, skippedControls: [] },
        },
        0
      )
    ).toBe('listening...');
  });
});

describe('joyConMapper disconnected prompt copy', () => {
  it('describes how mapping resumes after the Joy-Con connects', () => {
    expect(getDisconnectedPromptCopy()).toEqual({
      prompt: 'Connect a gamepad to begin',
      subprompt: 'The mapper will resume as soon as the left Joy-Con appears.',
    });
  });
});

describe('joyConMapper ready prompt copy', () => {
  it('explains the optional mapping flow before it starts', () => {
    expect(getReadyPromptCopy()).toEqual({
      prompt: 'Ready to map the left Joy-Con',
      subprompt:
        'Press Start Mapping. Every control is optional and can be skipped.',
    });
  });
});

describe('joyConMapper complete prompt copy', () => {
  it('describes the persisted mapping result', () => {
    expect(getCompletePromptCopy()).toEqual({
      prompt: 'Mapping complete',
      subprompt:
        'The saved mapping is persisted locally and shown in the output panel.',
    });
  });
});

describe('joyConMapper active prompt copy', () => {
  it('names the active control and its button capture behavior', () => {
    expect(getActivePromptCopy({ label: 'L', type: 'button' })).toEqual({
      prompt: 'Press L',
      subprompt:
        'The next newly pressed gamepad button will be saved for this control, or click Skip Current.',
    });
  });
});

describe('joyConMapper prompt completion', () => {
  it('completes at the end of the controls or without a current control', () => {
    expect(isPromptComplete({ currentIndex: 13, currentControl: {} })).toBe(
      true
    );
    expect(isPromptComplete({ currentIndex: 0, currentControl: null })).toBe(
      true
    );
    expect(isPromptComplete({ currentIndex: 0, currentControl: {} })).toBe(
      false
    );
  });
});

describe('joyConMapper started prompt copy', () => {
  it('uses the complete copy after the final control', () => {
    expect(
      getStartedPromptCopy({ currentIndex: 13, currentControl: {} })
    ).toEqual({
      prompt: 'Mapping complete',
      subprompt:
        'The saved mapping is persisted locally and shown in the output panel.',
    });
  });

  it('uses the active copy while a control remains', () => {
    expect(
      getStartedPromptCopy({
        currentIndex: 0,
        currentControl: { label: 'L', type: 'button' },
      })
    ).toEqual({
      prompt: 'Press L',
      subprompt:
        'The next newly pressed gamepad button will be saved for this control, or click Skip Current.',
    });
  });
});

describe('joyConMapper connected prompt copy', () => {
  it('uses the ready copy before mapping starts', () => {
    expect(getConnectedPromptCopy({ started: false })).toEqual({
      prompt: 'Ready to map the left Joy-Con',
      subprompt:
        'Press Start Mapping. Every control is optional and can be skipped.',
    });
  });

  it('uses the started copy after mapping begins', () => {
    expect(
      getConnectedPromptCopy({
        started: true,
        currentIndex: 0,
        currentControl: { label: 'L', type: 'button' },
      })
    ).toEqual({
      prompt: 'Press L',
      subprompt:
        'The next newly pressed gamepad button will be saved for this control, or click Skip Current.',
    });
  });
});

describe('joyConMapper prompt rendering', () => {
  it('renders disconnected and connected prompt copies', () => {
    const setTextContent = jest.fn();
    const dom = { getGamepads: () => [], setTextContent };
    const state = {
      dom,
      prompt: {},
      subprompt: {},
      hidDevices: [],
      started: false,
    };

    renderPrompt(state);
    expect(setTextContent).toHaveBeenNthCalledWith(
      1,
      state.prompt,
      'Connect a gamepad to begin'
    );
    expect(setTextContent).toHaveBeenNthCalledWith(
      2,
      state.subprompt,
      'The mapper will resume as soon as the left Joy-Con appears.'
    );

    setTextContent.mockClear();
    renderPrompt({ ...state, hidDevices: [{}] });
    expect(setTextContent).toHaveBeenNthCalledWith(
      1,
      state.prompt,
      'Ready to map the left Joy-Con'
    );
    expect(setTextContent).toHaveBeenNthCalledWith(
      2,
      state.subprompt,
      'Press Start Mapping. Every control is optional and can be skipped.'
    );
  });
});

describe('joyConMapper element helpers', () => {
  it('creates and applies optional element settings', () => {
    const created = {};
    const dom = {
      createElement: jest.fn(() => created),
      setClassName: jest.fn(),
      setTextContent: jest.fn(),
    };

    expect(createElement(dom, 'div')).toBe(created);
    expect(dom.createElement).toHaveBeenCalledWith('div');
    applyCreatedElementOptions(dom, created, undefined);
    applyCreatedElementOptions(dom, created, { className: '', text: 'hello' });
    applyCreatedElementOptions(dom, created, { className: 'active', text: 42 });
    applyElementClassName(dom, created, 'direct');
    applyElementClassName(dom, created, '');

    expect(dom.setClassName).toHaveBeenCalledWith(created, 'active');
    expect(dom.setClassName).toHaveBeenCalledWith(created, 'direct');
    expect(dom.setClassName).toHaveBeenCalledTimes(2);
    expect(dom.setTextContent).toHaveBeenCalledWith(created, 'hello');
    expect(dom.setTextContent).toHaveBeenCalledTimes(1);
  });
});
