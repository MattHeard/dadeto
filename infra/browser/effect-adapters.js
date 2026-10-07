import {
  createErrorBeaconHandlers,
  createErrorBeaconReporter,
  createErrorBeaconSendBeaconReporter,
} from '../core/browser/error-beacon.js';
import { createEffectFetchFn } from './allow-effects.js';
const createEndpointReporter = (urlPromise, createReporter) => payload =>
  urlPromise.then(url => (url ? createReporter(url)(payload) : undefined));
export const createEffectFetchBeaconReporter = (urlPromise, bind, fetchFn) =>
  createEndpointReporter(urlPromise, url =>
    createErrorBeaconReporter(bind, createEffectFetchFn(fetchFn), url)
  );
export const createEffectSendBeaconReporter = (
  urlPromise,
  bind,
  navigatorObj = globalThis.navigator
) =>
  createEndpointReporter(urlPromise, url =>
    createErrorBeaconSendBeaconReporter(
      bind,
      (permission, target, data) => {
        void permission;
        return (
          navigatorObj?.sendBeacon?.call(navigatorObj, target, data) ?? false
        );
      },
      url
    )
  );
export const createEffectStorage = storageObj => ({
  getItem: key => storageObj.getItem(key),
  setItem: (_permission, key, value) => storageObj.setItem(key, value),
  removeItem: (_permission, key) => storageObj.removeItem(key),
});
export const createBrowserErrorBeaconHandlers = (reportBeacon, getUserAgent) => {
  const dependencies = {
    reportBeacon,
    getUrl: () => globalThis.location?.href ?? '',
    getNow: () => Date.now(),
    logError: console.error.bind(console),
  };
  if (getUserAgent) dependencies.getUserAgent = getUserAgent;
  return createErrorBeaconHandlers(dependencies);
};
export const installGlobalErrorBeaconListeners = handlers => {
  globalThis.addEventListener('error', handlers.handleWindowError);
  globalThis.addEventListener('unhandledrejection', handlers.handleUnhandledRejection);
};
