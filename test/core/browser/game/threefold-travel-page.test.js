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
  test.each(['destination', 'button', 'travelTo'])(
    'does nothing when the travel %s dependency is missing',
    missing => {
      const select = { value: 'sluice' };
      const button = {
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      };
      const documentObj = {
        querySelector: selector =>
          selector === '#travel-destination'
            ? missing === 'destination'
              ? null
              : select
            : selector === '#travel-button'
              ? missing === 'button'
                ? null
                : button
              : null,
      };
      startThreefoldPage({ documentObj, windowObj: {}, navigatorObj: {} });
      const page = mockStartMosslightPage.mock.calls.at(-1)[0];
      const runtime = missing === 'travelTo' ? {} : { travelTo: jest.fn() };
      const dispose = page.bindRuntime({
        runtime,
        documentObj,
        draw: jest.fn(),
      });
      expect(dispose).toEqual(expect.any(Function));
      dispose();
    }
  );

  test.each([
    ['broken-gate', 'broken-gate', 'The Broken Gate'],
    ['sluice', 'small-world-sluice', 'The Tidal Archive'],
    ['silt-margin', 'silt-margin', 'The Silt Margin'],
    ['hearthgaps', 'hearthgaps', 'Hearthgaps'],
    ['weftways', 'weftways', 'The Weftways'],
    ['grainlands', 'grainlands', 'The Grainlands'],
    ['lantern-ward', 'lantern-ward', 'The Lantern Ward'],
    ['belltops', 'belltops', 'Belltops'],
    ['crownback-reach', 'crownback-reach', 'Crownback Reach'],
    ['shoals', 'wakeform-shoals', 'Wakeform Shoals'],
  ])(
    'switches to %s through the in-game menu without changing the URL',
    (destination, sceneId, title) => {
      const listeners = new Map();
      const select = { value: destination };
      const button = {
        addEventListener: (type, callback) => listeners.set(type, callback),
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
      const page = mockStartMosslightPage.mock.calls.at(-1)[0];
      const runtime = { travelTo: jest.fn() };
      const draw = jest.fn();
      const dispose = page.bindRuntime({ runtime, documentObj, draw });

      listeners.get('click')();

      expect(runtime.travelTo).toHaveBeenCalledWith(
        expect.objectContaining({ id: sceneId })
      );
      expect(status.textContent).toBe(`Arrived at ${title}.`);
      expect(objective.textContent).toContain('Current objective:');
      expect(objective.textContent).not.toContain('undefined');
      expect(draw).toHaveBeenCalledTimes(1);
      dispose();
      expect(listeners.has('click')).toBe(false);
    }
  );

  test('ignores an unknown in-game destination without changing the scene', () => {
    const listeners = new Map();
    const select = { value: 'unknown' };
    const button = {
      addEventListener: (type, callback) => listeners.set(type, callback),
      removeEventListener: jest.fn(),
    };
    const status = { textContent: 'Choose a destination.' };
    const objective = { textContent: 'Current objective.' };
    const documentObj = {
      querySelector: selector =>
        ({
          '#travel-destination': select,
          '#travel-button': button,
          '#travel-status': status,
          '#objective-reminder': objective,
        })[selector] || null,
    };
    startThreefoldPage({ documentObj, windowObj: {}, navigatorObj: {} });
    const page = mockStartMosslightPage.mock.calls.at(-1)[0];
    const runtime = { travelTo: jest.fn() };
    const draw = jest.fn();
    page.bindRuntime({ runtime, documentObj, draw });

    listeners.get('click')();

    expect(runtime.travelTo).not.toHaveBeenCalled();
    expect(status.textContent).toBe('Choose a destination.');
    expect(objective.textContent).toBe('Current objective.');
    expect(draw).not.toHaveBeenCalled();
  });

  test('travels when optional feedback nodes are absent', () => {
    const listeners = new Map();
    const select = { value: 'broken-gate' };
    const button = {
      addEventListener: (type, listener) => listeners.set(type, listener),
      removeEventListener: type => listeners.delete(type),
    };
    const documentObj = {
      querySelector: selector =>
        ({
          '#travel-destination': select,
          '#travel-button': button,
        })[selector] || null,
    };
    startThreefoldPage({ documentObj, windowObj: {}, navigatorObj: {} });
    const page = mockStartMosslightPage.mock.calls.at(-1)[0];
    const runtime = { travelTo: jest.fn() };
    const draw = jest.fn();
    page.bindRuntime({ runtime, documentObj, draw });

    listeners.get('click')();

    expect(runtime.travelTo).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'broken-gate' })
    );
    expect(draw).toHaveBeenCalledTimes(1);
  });
});
