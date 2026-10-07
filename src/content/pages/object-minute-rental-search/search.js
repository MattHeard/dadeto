import { createRentalSearchHandle } from "/core/browser/rentalSearch.js";
import { bindEffectBoundary, createEffectFetchFn } from "../../../browser/allow-effects.js";

const handle = createRentalSearchHandle({
  documentObj: document,
  fetchFn: createEffectFetchFn(globalThis.fetch.bind(globalThis)),
  bindEffectBoundary,
  readValues: form => Object.fromEntries(new FormData(form)),
});

export { buildSearchRequest } from "/core/browser/rentalSearch.js";
export const { renderSearchState } = handle;

handle.start();
