import { jest } from '@jest/globals';

const mockStartMosslightPage = jest.fn(() => () => {});

jest.unstable_mockModule(
  '../../../../src/core/browser/game/mosslight-valley/pagePresenter.js',
  () => ({
    createMosslightPageEnvironment: options => ({
      browser: {
        documentObj: options.documentObj,
        windowObj: options.windowObj,
        navigatorObj: options.navigatorObj,
      },
      animation: {
        requestFrame: options.requestFrame,
        cancelFrame: options.cancelFrame,
      },
    }),
    startMosslightPage: mockStartMosslightPage,
  })
);
jest.unstable_mockModule(
  '../../../../src/core/browser/game/mosslight-valley/renderer.js',
  () => ({
    drawGameFrame: jest.fn(),
    toFramePayload: jest.fn(() => ({})),
  })
);

const { startThreefoldPage } = await import(
  '../../../../src/core/browser/game/threefold/page.js'
);

describe('THREEFOLD in-game travel menu', () => {
  test('switches regions without changing the browser URL', () => {
    const listeners = new Map();
    const select = { value: 'sluice' };
    const button = {
      addEventListener: (type, listener) => listeners.set(type, listener),
      removeEventListener: type => listeners.delete(type),
    };
    const status = { textContent: '' };
    const objective = { textContent: '' };
    const documentObj = {
      querySelector: selector =>
        ({
          '#travel-destination': select,
          '#travel-button': button,
          '#travel-status': status,
          '#objective-reminder': objective,
        })[selector] || null,
    };
    startThreefoldPage({
      documentObj,
      windowObj: { location: { search: '' } },
      navigatorObj: {},
    });
    const page = mockStartMosslightPage.mock.calls[0][0];
    const runtime = { travelTo: jest.fn() };
    const draw = jest.fn();
    const dispose = page.bindRuntime({ runtime, documentObj, draw });

    listeners.get('click')();

    expect(runtime.travelTo).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'small-world-sluice' })
    );
    expect(status.textContent).toBe('Arrived at The Tidal Archive.');
    expect(objective.textContent).toContain('raise the lower basin');
    expect(draw).toHaveBeenCalledTimes(1);
    dispose();
    expect(listeners.has('click')).toBe(false);
  });
});
