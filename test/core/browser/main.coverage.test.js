import { describe, expect, it, jest } from '@jest/globals';

let mockFetchBlogData = jest.fn();
const mockHideArticlesByClass = jest.fn();
const mockHideArticlesWithoutClass = jest.fn();
const mockSetupAudio = jest.fn();
const mockHandleTagLinks = jest.fn();
const mockRevealBetaArticles = jest.fn();
const mockToggleToyFocusMode = jest.fn();
const mockInitializeDropdowns = jest.fn();
const mockReveal = jest.fn();
const mockCreateErrorBeaconReporter = jest.fn();
let observedEnv;
let observedBeaconHandlers;
let observedBlogDeps;
let observedInitOptions;
let mockDom = {
  logError: jest.fn(),
  setTextContent: jest.fn(),
  getElementsByTagName: () => [],
};

jest.unstable_mockModule('../../../src/core/browser/audio-controls.js', () => ({
  setupAudio: mockSetupAudio,
}));
jest.unstable_mockModule('../../../src/core/browser/tags.js', () => ({
  handleTagLinks: mockHandleTagLinks,
  hideArticlesByClass: mockHideArticlesByClass,
  hideArticlesWithoutClass: mockHideArticlesWithoutClass,
}));
jest.unstable_mockModule('../../../src/core/browser/data.js', () => ({
  createBlogDataController: dependencies => {
    observedBlogDeps = dependencies();
    return {
      fetchAndCacheBlogData: (mockFetchBlogData = jest.fn()),
      getData: jest.fn(),
      setLocalTemporaryData: jest.fn(),
      setLocalPermanentData: jest.fn(),
      getLocalPermanentData: jest.fn(),
    };
  },
  getEncodeBase64: () => jest.fn(),
}));
jest.unstable_mockModule('../../../src/core/browser/toys.js', () => ({
  createOutputDropdownHandler: (_handle, getData) => jest.fn(() => getData()),
  createInputDropdownHandler: () => jest.fn(),
  handleDropdownChange: jest.fn(),
  toggleToyFocusMode: mockToggleToyFocusMode,
  getComponentInitializer: jest.fn(),
  makeCreateIntersectionObserver: (_dom, env) => {
    observedEnv = env;
    const values = [...env.createEnv().values()];
    values.forEach(value => {
      if (typeof value === 'function') {
        try {
          value({});
        } catch {}
      }
    });
    return jest.fn();
  },
  initializeVisibleComponents: (...args) => {
    observedInitOptions = args[0];
    return args[1]();
  },
  createDropdownInitializer: outputHandler => {
    mockInitializeDropdowns.mockImplementation(() => outputHandler());
    return mockInitializeDropdowns;
  },
}));
jest.unstable_mockModule('../../../src/core/browser/document.js', () => ({
  dom: (mockDom = {
    logError: jest.fn(),
    setTextContent: jest.fn(),
    getElementsByTagName: () => [{}],
  }),
  getElementById: jest.fn(),
  log: jest.fn(),
  warn: jest.fn(),
  getCurrentTime: jest.fn(),
  getRandomNumber: jest.fn(),
  getUuid: jest.fn(),
  hasNoInteractiveComponents: jest.fn(),
  getInteractiveComponentCount: jest.fn(),
  getInteractiveComponents: jest.fn(),
  reveal: mockReveal,
}));
jest.unstable_mockModule('../../../src/core/browser/error-beacon.js', () => ({
  createErrorBeaconHandlers: options => {
    observedBeaconHandlers = options;
    options.getUrl();
    options.getUserAgent();
    options.getNow();
    return {
      logError: jest.fn(),
      handleWindowError: jest.fn(),
      handleUnhandledRejection: jest.fn(),
    };
  },
  createErrorBeaconReporter: mockCreateErrorBeaconReporter,
}));
jest.unstable_mockModule('../../../src/core/browser/beta.js', () => ({
  revealBetaArticles: mockRevealBetaArticles,
}));
jest.unstable_mockModule(
  '../../../src/core/browser/memoryStorageLens.js',
  () => ({
    createMemoryStorageLens: () => new Map(),
  })
);
jest.unstable_mockModule(
  '../../../src/core/browser/localStorageLens.js',
  () => ({
    createLocalStorageLens: () => new Map(),
  })
);

const { createMainHandle } = await import('../../../src/core/browser/main.js');

describe('browser main initialization', () => {
  it('covers initialization and interactive branches', () => {
    const handlers = new Map();
    const article = {};
    mockDom.getElementsByTagName = () => [article];
    let documentClick;
    const buttons = ['all', 'blog', 'toys', 'unknown'].map(filter => ({
      dataset: { filter },
      classList: { remove: jest.fn(), add: jest.fn() },
      addEventListener: (_, handler) => handlers.set(filter, handler),
    }));
    const windowObj = {
      console: { error: jest.fn() },
      fetch: jest.fn(),
      location: { href: 'https://example.test/' },
      navigator: { userAgent: 'test-agent' },
      addEventListener: (type, handler) => handlers.set(type, handler),
    };
    globalThis.Element = class Element {};
    const target = new Element();
    target.closest = () => ({});
    const documentObj = {
      querySelectorAll: () => buttons,
      addEventListener: (type, handler) => {
        if (type === 'click') documentClick = handler;
        else handlers.set(`document-${type}`, handler);
      },
    };

    createMainHandle({
      documentObj,
      windowObj,
      fetchFn: jest.fn(),
      storageObj: null,
    })();
    expect(mockCreateErrorBeaconReporter).toHaveBeenCalledWith(
      expect.any(Function),
      'https://europe-west1-irien-465710.cloudfunctions.net/prod-errors'
    );
    expect(observedEnv).toEqual(expect.objectContaining({
      globalState: expect.any(Object),
      createEnv: expect.any(Function),
      error: expect.any(Function),
      fetch: expect.any(Function),
    }));
    expect([...observedEnv.createEnv().keys()]).toEqual([
      'getRandomNumber',
      'getCurrentTime',
      'getUuid',
      'getData',
      'setLocalTemporaryData',
      'setLocalPermanentData',
      'getLocalPermanentData',
      'encodeBase64',
      'memoryLens',
      'permanentLens',
    ]);
    expect(observedBeaconHandlers.getUrl()).toBe('https://example.test/');
    expect(observedBeaconHandlers.getUserAgent()).toBe('test-agent');
    expect(observedBeaconHandlers.getNow()).toEqual(expect.any(Number));
    expect(observedBlogDeps).toEqual(expect.objectContaining({
      fetch: expect.any(Function),
      loggers: expect.any(Object),
      storage: null,
      memoryLens: expect.any(Map),
      permanentLens: expect.any(Map),
    }));
    expect(observedInitOptions).toEqual(expect.objectContaining({
      win: windowObj,
      logInfo: expect.any(Function),
      logWarning: expect.any(Function),
      getElement: expect.any(Function),
      hasNoInteractiveComponents: expect.any(Function),
      getInteractiveComponents: expect.any(Function),
      getInteractiveComponentCount: expect.any(Function),
      getComponentInitializer: expect.any(Function),
    }));
    buttons.forEach(button =>
      handlers.get(button.dataset.filter)({ preventDefault: jest.fn() })
    );
    expect(mockHideArticlesByClass).toHaveBeenCalledWith('tag-toy', mockDom);
    expect(mockHideArticlesWithoutClass).toHaveBeenCalledWith(
      'tag-toy',
      mockDom
    );
    expect(mockReveal).toHaveBeenCalledTimes(4);
    expect(buttons[0].classList.add).toHaveBeenCalledWith('active');
    expect(buttons[3].classList.add).toHaveBeenCalledWith('active');
    handlers.get('DOMContentLoaded')();
    expect(mockInitializeDropdowns).toHaveBeenCalled();
    documentClick({ target, preventDefault: jest.fn() });
    expect(mockToggleToyFocusMode).toHaveBeenCalledWith({}, expect.any(Object));
    const noButtonTarget = new Element();
    noButtonTarget.closest = () => null;
    documentClick({ target: noButtonTarget, preventDefault: jest.fn() });
    documentClick({ target: {}, preventDefault: jest.fn() });

    createMainHandle({
      documentObj: { querySelectorAll: () => [], addEventListener: jest.fn() },
      windowObj: { console: { error: jest.fn() }, addEventListener: jest.fn() },
      fetchFn: jest.fn(),
      storageObj: null,
    })();
    handlers.get('error')({});
    handlers.get('unhandledrejection')({});

    expect(mockHandleTagLinks).toHaveBeenCalledWith(mockDom);
    expect(mockSetupAudio).toHaveBeenCalledWith(
      mockDom,
      mockDom.setTextContent
    );
    expect(mockRevealBetaArticles).toHaveBeenCalledWith(mockDom);
    expect(mockFetchBlogData).toHaveBeenCalled();
  });
});
