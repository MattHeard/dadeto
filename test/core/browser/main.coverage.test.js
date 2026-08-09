import { describe, expect, it, jest } from '@jest/globals';

let mockSetupAudio = jest.fn();
let mockHandleTagLinks = jest.fn();
let mockHideArticlesByClass = jest.fn();
let mockHideArticlesWithoutClass = jest.fn();
let mockInitializeVisibleComponents = jest.fn();
let mockRevealBetaArticles = jest.fn();
let mockToggleToyFocusMode = jest.fn();
let mockFetchBlogData = jest.fn();
let mockDom = {
  logError: jest.fn(),
  setTextContent: jest.fn(),
  getElementsByTagName: () => [],
};

jest.unstable_mockModule('../../../src/core/browser/audio-controls.js', () => ({
  setupAudio: (mockSetupAudio = jest.fn()),
}));
jest.unstable_mockModule('../../../src/core/browser/tags.js', () => ({
  handleTagLinks: (mockHandleTagLinks = jest.fn()),
  hideArticlesByClass: (mockHideArticlesByClass = jest.fn()),
  hideArticlesWithoutClass: (mockHideArticlesWithoutClass = jest.fn()),
}));
jest.unstable_mockModule('../../../src/core/browser/data.js', () => ({
  createBlogDataController: dependencies => {
    dependencies();
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
  toggleToyFocusMode: (mockToggleToyFocusMode = jest.fn()),
  getComponentInitializer: jest.fn(),
  makeCreateIntersectionObserver: (_dom, env) => {
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
  initializeVisibleComponents: (mockInitializeVisibleComponents = (...args) =>
    args[1]()),
  createDropdownInitializer: outputHandler => jest.fn(() => outputHandler()),
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
  reveal: jest.fn(),
}));
jest.unstable_mockModule('../../../src/core/browser/error-beacon.js', () => ({
  createErrorBeaconHandlers: options => {
    options.getUrl();
    options.getUserAgent();
    options.getNow();
    return {
      logError: jest.fn(),
      handleWindowError: jest.fn(),
      handleUnhandledRejection: jest.fn(),
    };
  },
  createErrorBeaconReporter: jest.fn(),
}));
jest.unstable_mockModule('../../../src/core/browser/beta.js', () => ({
  revealBetaArticles: (mockRevealBetaArticles = jest.fn()),
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
      location: { href: '' },
      navigator: { userAgent: '' },
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
    buttons.forEach(button =>
      handlers.get(button.dataset.filter)({ preventDefault: jest.fn() })
    );
    handlers.get('DOMContentLoaded')();
    documentClick({ target, preventDefault: jest.fn() });
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

    expect(mockFetchBlogData).toHaveBeenCalled();
  });
});
