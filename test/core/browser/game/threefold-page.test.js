import { jest } from '@jest/globals';
import { readFileSync } from 'node:fs';

const THREEFOLD_HTML = readFileSync(
  new URL(
    '../../../../src/content/pages/threefold/index.html',
    import.meta.url
  ),
  'utf8'
);

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

const { startThreefoldPage } = await import(
  '../../../../src/core/browser/game/threefold/page.js'
);

describe('THREEFOLD page adapter', () => {
  beforeEach(() => mockStartMosslightPage.mockClear());

  test('exposes an accessible touch interaction for each episode choice', () => {
    expect(THREEFOLD_HTML).toContain('data-action="interact"');
    expect(THREEFOLD_HTML).toContain(
      'aria-label="Warn the Latchfolk, rescue ferry passengers, or withdraw up the upland road"'
    );
    expect(THREEFOLD_HTML).toContain('href="/threefold/?scene=sluice"');
  });

  test('uses the supplied storage and shared Mosslight page presenter', () => {
    const storage = {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    };
    const windowObj = { localStorage: storage };
    const options = { documentObj: {}, windowObj, navigatorObj: {} };
    const disposer = startThreefoldPage(options);
    const page = mockStartMosslightPage.mock.calls[0][0];

    expect(disposer).toEqual(expect.any(Function));
    expect(page.browser.windowObj).toBe(windowObj);
    expect(page.saveFilename).toBe('threefold-save.json');
    expect(page.createRuntime({ env: new Map() }).getState().scene.id).toBe(
      'broken-gate'
    );
  });

  test('falls back to in-memory storage when the browser denies localStorage', () => {
    const windowObj = Object.defineProperty({}, 'localStorage', {
      get() {
        throw new Error('storage denied');
      },
    });
    startThreefoldPage({ documentObj: {}, windowObj, navigatorObj: {} });
    const page = mockStartMosslightPage.mock.calls[0][0];

    expect(page.createRuntime({ env: new Map() }).getState().crisis.stage).toBe(
      'rising'
    );
  });

  test('prefers an explicitly supplied storage adapter', () => {
    const storage = {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    };
    startThreefoldPage({
      documentObj: {},
      windowObj: {},
      navigatorObj: {},
      storage,
    });
    const page = mockStartMosslightPage.mock.calls[0][0];

    expect(page.createRuntime({ env: new Map() }).getState().scene.id).toBe(
      'broken-gate'
    );
  });

  test('selects the standalone sluice route and updates its Mosslight page copy', () => {
    const elements = new Map(
      [
        '#chapter-subtitle',
        '#chapter-tag',
        '#chapter-eyebrow',
        '#chapter-heading',
        '#chapter-description',
        '#interact-label',
        '#scene-link',
        '#game-footer',
        '#interact-control',
      ].map(selector => [selector, { setAttribute: jest.fn() }])
    );
    const documentObj = {
      querySelector: selector => elements.get(selector),
    };
    const windowObj = {
      location: { search: '?scene=sluice' },
      localStorage: {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {},
      },
    };
    startThreefoldPage({ documentObj, windowObj, navigatorObj: {} });
    const page = mockStartMosslightPage.mock.calls[0][0];
    const state = page.createRuntime({ env: new Map() }).getState();

    expect(state.scene.id).toBe('small-world-sluice');
    expect(elements.get('#chapter-subtitle').textContent).toBe(
      'The Tidal Archive'
    );
    expect(elements.get('#scene-link').href).toBe('/threefold/');
    expect(elements.get('#interact-control').setAttribute).toHaveBeenCalledWith(
      'aria-label',
      'Operate the sluice service valve'
    );
  });

  test('keeps the default page when the route query is different and tolerates missing copy elements', () => {
    startThreefoldPage({
      documentObj: { querySelector: () => null },
      windowObj: { location: { search: '?scene=broken-gate' } },
      navigatorObj: {},
    });
    const page = mockStartMosslightPage.mock.calls[0][0];

    expect(page.createRuntime({ env: new Map() }).getState().scene.id).toBe(
      'broken-gate'
    );

    mockStartMosslightPage.mockClear();
    startThreefoldPage({
      documentObj: { querySelector: () => null },
      windowObj: { location: { search: '?scene=sluice' } },
      navigatorObj: {},
    });
    const sluicePage = mockStartMosslightPage.mock.calls[0][0];
    expect(
      sluicePage.createRuntime({ env: new Map() }).getState().scene.id
    ).toBe('small-world-sluice');
  });
});
