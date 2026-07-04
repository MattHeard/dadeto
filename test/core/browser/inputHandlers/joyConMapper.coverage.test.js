import { describe, expect, it, jest } from '@jest/globals';
import {
  joyConMapperHandler,
  joyConMapperTestOnly,
} from '../../../../src/core/browser/inputHandlers/joyConMapper.js';

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
  getGamepadStatusText,
  ensureStarted,
  advanceToNextControl,
  isPendingControlAfterIndex,
  currentControllerSnapshot,
  currentHidSnapshot,
  initializeWebHidCapture,
  requestAndOpenJoyConDevices,
  attachHidDeviceListener,
  openGrantedJoyConDevice,
  handleJoyConMapperReset,
  snapshotHidInputReport,
  snapshotHidButtons,
  snapshotHidAxes,
  snapshotGamepad,
  logHidDeviceEvent,
  toGamepadSnapshot,
  normalizeButtonSnapshot,
  normalizeAxisValue,
  refreshStoredState,
  syncCurrentControlFromIndex,
  maybeCapture,
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
      if (element) {
        element.className = className;
      }
    }),
    setTextContent: jest.fn((element, text) => {
      if (element) {
        element.textContent = text;
      }
    }),
    setValue: jest.fn((element, value) => {
      if (element) {
        element.value = value;
      }
    }),
    appendChild: jest.fn(),
    removeAllChildren: jest.fn(),
    setInterval: jest.fn(() => 1),
    clearInterval: jest.fn(),
    requestAnimationFrame: jest.fn(callback => callback()),
    getGamepads: jest.fn(() => []),
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
        {
          ...activeState,
          dom: createDom(),
          textInput: { value: '' },
          autoSubmitCheckbox: null,
          currentControl: control,
          prompt: {},
          subprompt: {},
          dot: { classList: { toggle: jest.fn() } },
          statusText: {},
          metaIndex: {},
          metaId: {},
          list: {},
        },
        { type: 'button', index: 0, value: 1 }
      )
    ).toBeUndefined();
    expect(
      updateCaptureState({ ...activeState, previousSnapshot: null }, null)
    ).toBeUndefined();
    expect(
      maybeCapture({
        ...activeState,
        dom: {
          ...createDom(),
          getGamepads: jest.fn(() => [
            {
              buttons: [],
              axes: [0.9],
            },
          ]),
        },
        textInput: { value: '' },
        autoSubmitCheckbox: null,
        currentControl: { type: 'axis', direction: 'positive' },
        previousSnapshot: {
          buttons: [],
          axes: [0],
        },
        prompt: {},
        subprompt: {},
        dot: { classList: { toggle: jest.fn() } },
        statusText: {},
        metaIndex: {},
        metaId: {},
        list: {},
      })
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

  it('covers stored-state and control-sync null fallbacks', () => {
    const dom = createDom();
    const storedState = {
      dom,
      started: true,
      currentIndex: 13,
      currentControl: { key: 'stick_down' },
      stored: { mappings: {}, skippedControls: [] },
    };

    refreshStoredState(storedState);
    expect(storedState.currentIndex).toBe(13);
    expect(storedState.currentControl).toBeNull();

    const syncedState = {
      currentIndex: 13,
      currentControl: { key: 'stick_down' },
    };

    syncCurrentControlFromIndex(syncedState);
    expect(syncedState.currentControl).toBeNull();
  });

  it('covers WebHID snapshot normalization helpers', () => {
    const hidSnapshot = {
      buttons: [{ pressed: true, value: 1 }],
      axes: [0.3333333],
    };

    expect(currentHidSnapshot({ hidSnapshot })).toBe(hidSnapshot);
    expect(
      currentControllerSnapshot({
        dom: createDom(),
        hidSnapshot,
      })
    ).toBe(hidSnapshot);
    expect(toGamepadSnapshot(hidSnapshot)).toEqual({
      buttons: [{ pressed: true, value: 1 }],
      axes: [0.3333],
    });
    expect(normalizeButtonSnapshot({ pressed: 1, value: '2' })).toEqual({
      pressed: false,
      value: 2,
    });
    expect(normalizeAxisValue(0.123456)).toBe(0.1235);
    expect(
      currentControllerSnapshot({
        dom: {
          getGamepads: jest.fn(() => [
            {
              buttons: [],
              axes: [],
            },
          ]),
        },
        hidSnapshot,
      })
    ).toBe(hidSnapshot);
  });

  it('covers WebHID listener setup and report decoding', async () => {
    const disposers = [];
    const device = {
      addEventListener: jest.fn((event, handler) => {
        device._handler = handler;
      }),
      removeEventListener: jest.fn(),
    };
    const dom = {
      getGamepads: jest.fn(() => []),
      globalThis: {
        navigator: {
          hid: {
            getDevices: jest.fn(async () => [device]),
          },
        },
      },
      getGamepads: jest.fn(() => []),
    };
    const state = { dom, hidSnapshot: null };

    initializeWebHidCapture(state, disposers);
    await Promise.resolve();

    expect(device.addEventListener).toHaveBeenCalledWith(
      'inputreport',
      expect.any(Function)
    );
    expect(disposers).toHaveLength(1);

    attachHidDeviceListener(state, disposers, device);
    expect(disposers).toHaveLength(2);

    const report = {
      reportId: 0x3f,
      data: new DataView(Uint8Array.from([0x3f, 0x03, 0x00, 0x02]).buffer),
    };
    expect(snapshotHidInputReport(report)).toEqual({
      buttons: snapshotHidButtons([0x03, 0x00]),
      axes: snapshotHidAxes(0x02),
    });

    device._handler(report);
    expect(state.hidSnapshot).toBeNull();
    expect(state.hidPendingSnapshotCount).toBe(1);

    device._handler(report);
    expect(state.hidSnapshot).toEqual({
      buttons: snapshotHidButtons([0x03, 0x00]),
      axes: snapshotHidAxes(0x02),
    });
  });

  it('covers WebHID request-and-open flow', async () => {
    const disposers = [];
    const device = {
      opened: false,
      open: jest.fn(async function open() {
        device.opened = true;
      }),
      addEventListener: jest.fn((event, handler) => {
        device._handler = handler;
      }),
      removeEventListener: jest.fn(),
      productName: 'Joy-Con (L)',
      vendorId: 1406,
      productId: 8198,
    };
    const dom = {
      globalThis: {
        navigator: {
          hid: {
            requestDevice: jest.fn(async () => [device]),
          },
        },
      },
    };
    const state = {
      dom: {
        ...dom,
        getGamepads: jest.fn(() => []),
        setTextContent: jest.fn(),
        setClassName: jest.fn(),
      },
      hidSnapshot: null,
      hidDevices: [],
      prompt: { textContent: '' },
      subprompt: { textContent: '' },
      dot: { classList: { toggle: jest.fn() } },
      statusText: { textContent: '' },
      metaIndex: { textContent: '' },
      metaId: { textContent: '' },
      list: {},
    };

    await requestAndOpenJoyConDevices(state, disposers);

    expect(dom.globalThis.navigator.hid.requestDevice).toHaveBeenCalledWith({
      filters: [
        { vendorId: 0x057e, productId: 0x2006 },
        { vendorId: 0x057e, productId: 0x2007 },
        { vendorId: 0x057e, productId: 0x2008 },
        { vendorId: 0x057e, productId: 0x2009 },
      ],
    });
    expect(device.open).toHaveBeenCalled();
    expect(device.addEventListener).toHaveBeenCalledWith(
      'inputreport',
      expect.any(Function)
    );
    expect(state.hidDevices).toContain(device);
  });

  it('logs each WebHID input report', () => {
    const disposers = [];
    const device = {
      productName: 'Joy-Con (L)',
      vendorId: 1406,
      productId: 8198,
      addEventListener: jest.fn((event, handler) => {
        device._handler = handler;
      }),
      removeEventListener: jest.fn(),
    };
    const state = { dom: createDom(), hidSnapshot: null, hidDevices: [device] };

    attachHidDeviceListener(state, disposers, device);
    device._handler({
      reportId: 0x3f,
      data: new DataView(Uint8Array.from([0x3f, 0x03, 0x00, 0x02]).buffer),
    });
    device._handler({
      reportId: 0x3f,
      data: new DataView(Uint8Array.from([0x3f, 0x03, 0x00, 0x02]).buffer),
    });

    expect(state.hidSnapshot).toEqual({
      buttons: snapshotHidButtons([0x03, 0x00]),
      axes: snapshotHidAxes(0x02),
    });
  });

  it('waits for a repeated HID snapshot before adopting it', () => {
    const disposers = [];
    const device = {
      productName: 'Joy-Con (L)',
      vendorId: 1406,
      productId: 8198,
      addEventListener: jest.fn((event, handler) => {
        device._handler = handler;
      }),
      removeEventListener: jest.fn(),
    };
    const state = {
      dom: createDom(),
      hidSnapshot: null,
      hidPendingSnapshot: null,
      hidPendingSnapshotCount: 0,
    };

    attachHidDeviceListener(state, disposers, device);
    const report = {
      reportId: 0x3f,
      data: new DataView(Uint8Array.from([0x3f, 0x03, 0x00, 0x02]).buffer),
    };

    device._handler(report);
    expect(state.hidSnapshot).toBeNull();
    expect(state.hidPendingSnapshotCount).toBe(1);

    device._handler(report);
    expect(state.hidSnapshot).toEqual({
      buttons: snapshotHidButtons([0x03, 0x00]),
      axes: snapshotHidAxes(0x02),
    });
  });

  it('covers WebHID listener guards and gamepad snapshotting', () => {
    const state = { dom: createDom(), hidSnapshot: null };
    const disposers = [];

    attachHidDeviceListener(state, disposers, {});
    expect(disposers).toHaveLength(0);
    expect(snapshotGamepad(null)).toBeNull();
    expect(
      snapshotGamepad({
        buttons: [{ pressed: true, value: 0.8 }],
        axes: [0.123456],
      })
    ).toEqual({
      buttons: [{ pressed: true, value: 0.8 }],
      axes: [0.1235],
    });
    expect(
      snapshotHidInputReport({
        data: { buffer: new Uint8Array([]).buffer },
      })
    ).toEqual({
      buttons: [],
      axes: [],
    });
    expect(snapshotHidAxes(8)).toEqual([0, 0]);
    expect(snapshotHidAxes(2)).toEqual([1, 0]);
    expect(snapshotHidAxes(4)).toEqual([0, 1]);
    expect(snapshotHidAxes(6)).toEqual([-1, 0]);
    expect(snapshotHidAxes(7)).toEqual([-1, -1]);
    expect(
      snapshotHidInputReport({
        data: { buffer: new Uint8Array([0x01, 0x02, 0x04]).buffer },
      })
    ).toEqual({
      buttons: snapshotHidButtons([0x01, 0x02]),
      axes: snapshotHidAxes(0x04),
    });
  });

  it('covers WebHID no-device and no-HID guards', () => {
    const disposers = [];
    const silentDom = {
      globalThis: {},
    };

    initializeWebHidCapture({ dom: silentDom, hidSnapshot: null }, disposers);
    expect(disposers).toHaveLength(0);
    expect(logHidDeviceEvent('connected', null)).toBeUndefined();
  });

  it('covers WebHID connect and disconnect listener registration', async () => {
    const disposers = [];
    const dom = createDom();
    dom.globalThis.navigator = {
      hid: {
        addEventListener: jest.fn((type, handler) => {
          handler({ device: null });
        }),
        removeEventListener: jest.fn(),
        getDevices: jest.fn(async () => []),
      },
    };
    const prompt = {};
    const subprompt = {};
    const dot = { classList: { toggle: jest.fn() } };
    const statusText = {};
    const metaIndex = {};
    const metaId = {};

    initializeWebHidCapture(
      {
        dom,
        prompt,
        subprompt,
        dot,
        statusText,
        metaIndex,
        metaId,
        hidSnapshot: null,
      },
      disposers
    );
    await Promise.resolve();

    expect(dom.globalThis.navigator.hid.addEventListener).toHaveBeenCalledWith(
      'connect',
      expect.any(Function)
    );
    expect(dom.globalThis.navigator.hid.addEventListener).toHaveBeenCalledWith(
      'disconnect',
      expect.any(Function)
    );
    expect(disposers).toHaveLength(2);
    disposers.forEach(dispose => dispose());
    expect(
      dom.globalThis.navigator.hid.removeEventListener
    ).toHaveBeenCalledWith('connect', expect.any(Function));
    expect(
      dom.globalThis.navigator.hid.removeEventListener
    ).toHaveBeenCalledWith('disconnect', expect.any(Function));
  });

  it('covers openGrantedJoyConDevice guards and non-opening branch', async () => {
    const disposers = [];
    const state = {
      dom: createDom(),
      prompt: {},
      subprompt: {},
      dot: { classList: { toggle: jest.fn() } },
      statusText: {},
      metaIndex: {},
      metaId: {},
      hidDevices: [],
      hidPendingSnapshot: null,
      hidPendingSnapshotCount: 0,
    };
    const device = {
      opened: true,
      open: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    };

    await openGrantedJoyConDevice(state, disposers, null);
    await openGrantedJoyConDevice(state, disposers, device);

    expect(device.open).not.toHaveBeenCalled();
    expect(state.hidDevices).toContain(device);

    await openGrantedJoyConDevice(state, disposers, device);
    expect(state.hidDevices).toHaveLength(1);
  });

  it('covers connect and disconnect event payload branches', async () => {
    const connectHandler = jest.fn();
    const disconnectHandler = jest.fn();
    const device = { id: 'connected' };
    const dom = createDom();
    dom.globalThis.navigator = {
      hid: {
        addEventListener: jest.fn((type, handler) => {
          if (type === 'connect') {
            connectHandler.mockImplementation(handler);
          }
          if (type === 'disconnect') {
            disconnectHandler.mockImplementation(handler);
          }
        }),
        removeEventListener: jest.fn(),
        getDevices: jest.fn(async () => []),
      },
    };
    const prompt = {};
    const subprompt = {};
    const dot = { classList: { toggle: jest.fn() } };
    const statusText = {};
    const metaIndex = {};
    const metaId = {};
    const state = {
      dom,
      prompt,
      subprompt,
      dot,
      statusText,
      metaIndex,
      metaId,
      hidDevices: [],
      hidPendingSnapshot: null,
      hidPendingSnapshotCount: 0,
    };
    const disposers = [];

    initializeWebHidCapture(state, disposers);
    connectHandler({ device });
    disconnectHandler({ device });

    expect(state.hidDevices).toHaveLength(0);
  });

  it('covers the no-requestDevice guard', async () => {
    const disposers = [];
    const dom = createDom();
    dom.globalThis.navigator = {
      hid: { getDevices: jest.fn().mockResolvedValue([]) },
    };
    const prompt = {};
    const subprompt = {};
    const dot = { classList: { toggle: jest.fn() } };
    const statusText = {};
    const metaIndex = {};
    const metaId = {};
    const state = {
      dom,
      prompt,
      subprompt,
      dot,
      statusText,
      metaIndex,
      metaId,
      hidDevices: [],
      hidPendingSnapshot: null,
      hidPendingSnapshotCount: 0,
    };

    await requestAndOpenJoyConDevices(state, disposers);
    expect(disposers).toHaveLength(0);
    expect(state.hidDevices).toHaveLength(0);
  });

  it('covers request-and-open and attach listener cleanup branches', async () => {
    const open = jest.fn().mockResolvedValue(undefined);
    const removeEventListener = jest.fn();
    const device = {
      opened: false,
      open,
      addEventListener: jest.fn(),
      removeEventListener,
    };
    const hid = {
      requestDevice: jest.fn().mockResolvedValue([null, device]),
      getDevices: jest.fn().mockResolvedValue([]),
    };
    const dom = createDom();
    dom.globalThis.navigator = { hid };
    const prompt = {};
    const subprompt = {};
    const dot = { classList: { toggle: jest.fn() } };
    const statusText = {};
    const metaIndex = {};
    const metaId = {};
    const state = {
      dom,
      prompt,
      subprompt,
      dot,
      statusText,
      metaIndex,
      metaId,
      hidDevices: [],
      hidPendingSnapshot: null,
      hidPendingSnapshotCount: 0,
    };
    const disposers = [];

    await requestAndOpenJoyConDevices(state, disposers);
    expect(open).toHaveBeenCalledTimes(1);
    expect(state.hidDevices).toContain(device);
    expect(disposers).toHaveLength(1);

    disposers[0]();
    expect(removeEventListener).toHaveBeenCalledWith(
      'inputreport',
      expect.any(Function)
    );
  });

  it('opens granted devices and tracks them once', async () => {
    const disposers = [];
    const openedDevice = {
      opened: false,
      open: jest.fn(async () => {
        openedDevice.opened = true;
      }),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    };
    const state = {
      dom: createDom(),
      prompt: {},
      subprompt: {},
      dot: { classList: { toggle: jest.fn() } },
      statusText: {},
      metaIndex: {},
      metaId: {},
      hidDevices: [],
      hidPendingSnapshot: null,
      hidPendingSnapshotCount: 0,
    };

    state.dom.globalThis.navigator = {
      hid: {
        requestDevice: jest.fn(async () => [openedDevice]),
      },
    };

    await requestAndOpenJoyConDevices(state, disposers);
    expect(openedDevice.open).toHaveBeenCalledTimes(1);
    expect(state.hidDevices).toContain(openedDevice);
  });

  it('covers the reset branch through the rendered action button', async () => {
    const elements = [];
    const dom = {
      globalThis: {
        navigator: {
          hid: {
            getDevices: jest.fn(async () => []),
          },
        },
      },
      createElement: jest.fn((tag, options = {}) => {
        const element = {
          tagName: tag,
          classList: { add: jest.fn(), toggle: jest.fn() },
          _handlers: {},
        };
        if (options.text !== undefined) {
          element.textContent = options.text;
        }
        if (options.className !== undefined) {
          element.className = options.className;
        }
        elements.push(element);
        return element;
      }),
      addEventListener: jest.fn((element, type, handler) => {
        element._handlers[type] = handler;
      }),
      removeEventListener: jest.fn(),
      appendChild: jest.fn(),
      getNextSibling: jest.fn(() => null),
      insertBefore: jest.fn(),
      setClassName: jest.fn(),
      setTextContent: jest.fn((element, text) => {
        element.textContent = text;
      }),
      setValue: jest.fn(),
      removeAllChildren: jest.fn(),
      hide: jest.fn(),
      disable: jest.fn(),
      requestAnimationFrame: jest.fn(callback => callback()),
      getGamepads: jest.fn(() => []),
      querySelector: jest.fn(),
      setInterval: jest.fn(() => 1),
      clearInterval: jest.fn(),
    };
    const container = { closest: jest.fn(() => null) };
    const textInput = {};

    joyConMapperHandler(dom, container, textInput);
    const resetButton = elements.find(
      element => element.textContent === 'Reset Mapping'
    );
    expect(resetButton).toBeDefined();
    await resetButton._handlers.click();
  });

  it('covers reset cleanup when the device list is missing or sparse', () => {
    const dom = createDom();
    const baseState = {
      dom,
      textInput: {},
      autoSubmitCheckbox: { dispatchEvent: jest.fn() },
      started: true,
      currentIndex: 3,
      currentControl: null,
      previousSnapshot: null,
      hidPendingSnapshot: { buttons: [], axes: [] },
      hidPendingSnapshotCount: 2,
      hidDevices: [null, { id: 'keep-me' }],
      stored: { mappings: {}, skippedControls: [] },
      list: {},
      prompt: {},
      subprompt: {},
      dot: { classList: { toggle: jest.fn() } },
      statusText: {},
      metaIndex: {},
      metaId: {},
    };

    handleJoyConMapperReset(baseState);
    expect(baseState.hidDevices).toEqual([{ id: 'keep-me' }]);

    const missingDevicesState = {
      ...baseState,
      hidDevices: undefined,
    };
    handleJoyConMapperReset(missingDevicesState);
    expect(missingDevicesState.hidDevices).toEqual([]);
  });

  it('covers repeated snapshot stabilization', () => {
    const pendingSnapshot = {
      buttons: [
        { pressed: false, value: 0 },
        { pressed: false, value: 0 },
        { pressed: false, value: 0 },
        { pressed: false, value: 0 },
        { pressed: false, value: 0 },
        { pressed: false, value: 0 },
        { pressed: false, value: 0 },
        { pressed: false, value: 0 },
      ],
      axes: [],
    };
    const state = {
      dom: createDom(),
      prompt: {},
      subprompt: {},
      dot: { classList: { toggle: jest.fn() } },
      statusText: {},
      metaIndex: {},
      metaId: {},
      hidPendingSnapshot: pendingSnapshot,
      hidPendingSnapshotCount: 0,
      hidSnapshot: null,
      hidDevices: [],
    };
    const disposers = [];
    let reportHandler;
    const device = {
      addEventListener: jest.fn((type, handler) => {
        if (type === 'inputreport') {
          reportHandler = handler;
        }
      }),
      removeEventListener: jest.fn(),
    };

    attachHidDeviceListener(state, disposers, device);
    reportHandler({
      data: { buffer: new Uint8Array([0x00]).buffer },
    });
    expect(state.hidPendingSnapshotCount).toBe(1);
    expect(state.hidSnapshot).toBeNull();
  });

  it('covers the pending snapshot early return path', () => {
    const pendingSnapshot = { buttons: [], axes: [] };
    const state = {
      dom: createDom(),
      prompt: {},
      subprompt: {},
      dot: { classList: { toggle: jest.fn() } },
      statusText: {},
      metaIndex: {},
      metaId: {},
      hidPendingSnapshot: pendingSnapshot,
      hidPendingSnapshotCount: 0,
      hidSnapshot: null,
      hidDevices: [],
    };
    const disposers = [];
    let reportHandler;
    const device = {
      addEventListener: jest.fn((type, handler) => {
        if (type === 'inputreport') {
          reportHandler = handler;
        }
      }),
      removeEventListener: jest.fn(),
    };

    attachHidDeviceListener(state, disposers, device);
    reportHandler({
      data: { buffer: new Uint8Array([0x00]).buffer },
    });

    expect(state.hidPendingSnapshotCount).toBe(1);
    expect(state.hidSnapshot).toBeNull();
  });

  it('treats connected HID devices as connected input for the prompt/status', () => {
    expect(getGamepadStatusText(null, true)).toBe('Gamepad detected');
  });
});
