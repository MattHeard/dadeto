import {
  findExistingOption as findExistingOptionCore,
  findExistingPage as findExistingPageCore,
  parseIncomingOption as parseIncomingOptionCore,
} from './submit-new-page-core.js';

/**
 * @param {Parameters<typeof parseIncomingOptionCore>[0]} input Incoming option.
 * @returns {ReturnType<typeof parseIncomingOptionCore>} Parsed option.
 */
export const parseIncomingOption = input => parseIncomingOptionCore(input);
/**
 * @param {Parameters<typeof findExistingOptionCore>[0]} db Database.
 * @param {Parameters<typeof findExistingOptionCore>[1]} option Option.
 * @returns {ReturnType<typeof findExistingOptionCore>} Existing option.
 */
export const findExistingOption = (db, option) =>
  findExistingOptionCore(db, option);
/**
 * @param {Parameters<typeof findExistingPageCore>[0]} db Database.
 * @param {Parameters<typeof findExistingPageCore>[1]} pageNumber Page number.
 * @returns {ReturnType<typeof findExistingPageCore>} Existing page.
 */
export const findExistingPage = (db, pageNumber) =>
  findExistingPageCore(db, pageNumber);
