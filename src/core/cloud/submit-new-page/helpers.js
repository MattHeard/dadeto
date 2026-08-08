import {
  findExistingOption as findExistingOptionCore,
  findExistingPage as findExistingPageCore,
  parseIncomingOption as parseIncomingOptionCore,
} from './submit-new-page-core.js';

export const parseIncomingOption = input => parseIncomingOptionCore(input);
export const findExistingOption = (db, option) =>
  findExistingOptionCore(db, option);
export const findExistingPage = (db, pageNumber) =>
  findExistingPageCore(db, pageNumber);
