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
  toggleToyFocusMode: mockToggleToyFocusMode,
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
  initializeVisibleComponents: (...args) => args[1](),
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
    expect(mockHideArticlesByClass).toHaveBeenCalledWith('tag-toy', mockDom);
    expect(mockHideArticlesWithoutClass).toHaveBeenCalledWith('tag-toy', mockDom);
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
    expect(mockSetupAudio).toHaveBeenCalledWith(mockDom, mockDom.setTextContent);
    expect(mockRevealBetaArticles).toHaveBeenCalledWith(mockDom);
    expect(mockFetchBlogData).toHaveBeenCalled();
  });
});
