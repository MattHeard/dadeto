import { createRentalSearchHandle } from "/core/browser/rentalSearch.js";

const handle = createRentalSearchHandle({
  documentObj: document,
  fetchFn: fetch,
  readValues: form => Object.fromEntries(new FormData(form)),
});

export { buildSearchRequest } from "/core/browser/rentalSearch.js";
export const { renderSearchState } = handle;

handle.start();
