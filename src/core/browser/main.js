import { setupAudio } from './audio-controls.js';
import {
  handleTagLinks,
  hideArticlesByClass,
  hideArticlesWithoutClass,
} from './tags.js';
import { createBlogDataController, getEncodeBase64 } from './data.js';
import {
  createOutputDropdownHandler,
  createInputDropdownHandler,
  handleDropdownChange,
  toggleToyFocusMode,
  getComponentInitializer,
  makeCreateIntersectionObserver,
  initializeVisibleComponents,
  createDropdownInitializer,
} from './toys.js';

import {
  dom,
  getElementById,
  log,
  warn,
  getCurrentTime,
  getRandomNumber,
  getUuid,
  hasNoInteractiveComponents,
  getInteractiveComponentCount,
  getInteractiveComponents,
  reveal,
} from './document.js';
import {
  createErrorBeaconHandlers,
  createErrorBeaconReporter,
} from './error-beacon.js';
import { revealBetaArticles } from './beta.js';
import { createMemoryStorageLens } from './memoryStorageLens.js';
import { createLocalStorageLens } from './localStorageLens.js';

const globalState = {
  blog: null, // Holds the fetched blog data
  blogStatus: 'idle', // 'idle', 'loading', 'loaded', 'error'
  blogError: null, // Stores any error during fetch
  blogFetchPromise: null, // Tracks the ongoing fetch promise
  temporary: {}, // Holds data managed by toys like setTemporary
};

/**
 * @module main
 * @description Main entry point for the application
 */

/**
 * Create the browser main entry handle.
 * @param {{
 *   documentObj: Document,
 *   windowObj: Window,
 *   fetchFn: typeof fetch,
 *   storageObj: Storage | null,
 * }} deps Browser dependencies.
 * @returns {() => void} Entry handle that performs browser initialization when invoked.
 */
export function createMainHandle({
  documentObj,
  windowObj,
  fetchFn,
  storageObj,
}) {
  return function handleMain() {
    const beaconEndpoint = '/prod-errors';
    const beaconReporter = createErrorBeaconReporter(
      windowObj.fetch?.bind(windowObj),
      beaconEndpoint
    );
    const errorHandlers = createErrorBeaconHandlers({
      reportBeacon: beaconReporter,
      getUrl: () => windowObj.location?.href ?? '',
      getUserAgent: () => windowObj.navigator?.userAgent ?? '',
      getNow: () => Date.now(),
      logError: dom.logError,
    });
    windowObj.console.error = errorHandlers.logError;
    const loggers = {
      logInfo: log,
      logError: errorHandlers.logError,
      logWarning: warn,
    };
    const memoryLens = createMemoryStorageLens(new Map());
    const permanentLens = createLocalStorageLens({
      storage: storageObj,
      logError: errorHandlers.logError,
    });

    const createBlogDependencies = () => ({
      fetch: fetchFn,
      loggers,
      storage: storageObj,
      memoryLens,
      permanentLens,
    });

    const {
      fetchAndCacheBlogData: fetchBlogData,
      getData: getBlogData,
      setLocalTemporaryData: applyLocalTemporaryData,
      setLocalPermanentData: applyLocalPermanentData,
      getLocalPermanentData: fetchLocalPermanentData,
    } = createBlogDataController(createBlogDependencies);

    const createEnv = () =>
      new Map([
        ['getRandomNumber', getRandomNumber],
        ['getCurrentTime', getCurrentTime],
        ['getUuid', getUuid],
        ['getData', () => getBlogData(globalState)],
        [
          'setLocalTemporaryData',
          newData =>
            applyLocalTemporaryData({ desired: newData, current: globalState }),
        ],
        ['setLocalPermanentData', newData => applyLocalPermanentData(newData)],
        ['getLocalPermanentData', () => fetchLocalPermanentData()],
        ['encodeBase64', getEncodeBase64(btoa, encodeURIComponent)],
        ['memoryLens', memoryLens],
        ['permanentLens', permanentLens],
      ]);

    const env = {
      globalState,
      createEnv,
      error: dom.logError,
      fetch: fetchFn,
      loggers,
      getUuid,
    };

    initializeVisibleComponents(
      {
        win: windowObj,
        logInfo: log,
        logWarning: warn,
        getElement: getElementById,
        hasNoInteractiveComponents,
        getInteractiveComponents,
        getInteractiveComponentCount,
        getComponentInitializer,
      },
      makeCreateIntersectionObserver(dom, env)
    );

    handleTagLinks(dom);

    /**
     *
     */
    function resetFilters() {
      const articles = Array.from(dom.getElementsByTagName('article'));
      for (const article of articles) {
        reveal(article);
      }
    }

    /**
     *
     */
    function initializeFilterButtons() {
      const buttons = documentObj.querySelectorAll('.filter-button');

      buttons.forEach(button => {
        button.addEventListener('click', e => {
          e.preventDefault();
          const filterType = button.dataset.filter;

          buttons.forEach(btn => btn.classList.remove('active'));
          button.classList.add('active');

          resetFilters();
          switch (filterType) {
            case 'all':
              break;
            case 'blog':
              hideArticlesByClass('tag-toy', dom);
              break;
            case 'toys':
              hideArticlesWithoutClass('tag-toy', dom);
              break;
          }
        });
      });
    }

    initializeFilterButtons();

    fetchBlogData(globalState);

    setupAudio(dom, dom.setTextContent);

    const getDataCallback = () => getBlogData(globalState);

    const onOutputDropdownChange = createOutputDropdownHandler(
      handleDropdownChange,
      getDataCallback,
      dom
    );

    const onInputDropdownChange = createInputDropdownHandler(dom);

    const initializeDropdowns = createDropdownInitializer(
      onOutputDropdownChange,
      onInputDropdownChange,
      dom
    );

    windowObj.addEventListener('DOMContentLoaded', () => {
      initializeDropdowns();

      revealBetaArticles(dom);

      documentObj.addEventListener('click', event => {
        const target = event.target;
        if (!(target instanceof Element)) {
          return;
        }
        const button = target.closest('.toy-focus-toggle');
        if (!button) {
          return;
        }
        event.preventDefault();
        toggleToyFocusMode(button, dom);
      });
    });

    windowObj.addEventListener('error', errorHandlers.handleWindowError);
    windowObj.addEventListener(
      'unhandledrejection',
      errorHandlers.handleUnhandledRejection
    );
  };
}
