import {
  buildPageByNumberQuery,
  buildVariantByNameQuery,
} from '../firestore-helpers.js';

/**
 * Split option string into parts.
 * @param {string} str String.
 * @returns {string[]} Parts.
 */
function splitOptionString(str) {
  return String(str)
    .split(/[^0-9a-zA-Z]+/)
    .filter(Boolean);
}

/**
 * Validate variant name.
 * @param {string} variantName Variant name.
 * @returns {boolean} True if valid.
 */
function isValidVariantName(variantName) {
  return /^[a-zA-Z]+$/.test(variantName);
}

/**
 * Validate parsed numbers.
 * @param {number} pageNumber Page number.
 * @param {number} optionNumber Option number.
 * @returns {boolean} True if valid.
 */
function areValidNumbers(pageNumber, optionNumber) {
  return Number.isInteger(pageNumber) && Number.isInteger(optionNumber);
}

/**
 * Validate parts count.
 * @param {string[]} parts Parts.
 * @returns {boolean} True if valid.
 */
function hasValidPartsCount(parts) {
  return parts.length === 3;
}

/**
 * Validate numbers and create info.
 * @param {number} pageNumber Page number.
 * @param {number} optionNumber Option number.
 * @param {string} variantName Variant name.
 * @returns {object | null} Option info.
 */
function validateAndCreateInfo(pageNumber, optionNumber, variantName) {
  if (!areValidNumbers(pageNumber, optionNumber)) {
    return null;
  }
  return { pageNumber, variantName, optionNumber };
}

/**
 * Create option info from parts.
 * @param {string} pageStr Page string.
 * @param {string} variantName Variant name.
 * @param {string} optionStr Option string.
 * @returns {object | null} Option info.
 */
function createOptionInfo(pageStr, variantName, optionStr) {
  const pageNumber = Number.parseInt(pageStr, 10);
  const optionNumber = Number.parseInt(optionStr, 10);

  if (!isValidVariantName(variantName)) {
    return null;
  }
  return validateAndCreateInfo(pageNumber, optionNumber, variantName);
}

/**
 * Parse parts into option info.
 * @param {string[]} parts Parts.
 * @returns {object | null} Parsed info.
 */
function parseParts(parts) {
  if (!hasValidPartsCount(parts)) {
    return null;
  }
  const [pageStr, variantName, optionStr] = parts;
  return createOptionInfo(pageStr, variantName, optionStr);
}

/**
 * Parse a user supplied incoming option reference.
 * @param {string} str Raw option string.
 * @returns {{pageNumber: number, variantName: string, optionNumber: number}|null}
 *   Parsed info or null when invalid.
 */
export function parseIncomingOption(str) {
  if (!str) {
    return null;
  }
  const parts = splitOptionString(str);
  return parseParts(parts);
}

/**
 * Find page by number.
 * @param {object} db Database.
 * @param {number} pageNumber Page number.
 * @returns {Promise<object | null>} Page ref.
 */
async function findPageByNumber(db, pageNumber) {
  const pageSnap = await buildPageByNumberQuery(db, pageNumber).get();
  if (pageSnap.empty) {
    return null;
  }
  return pageSnap.docs[0].ref;
}

/**
 * Find variant by name.
 * @param {object} pageRef Page ref.
 * @param {string} variantName Variant name.
 * @returns {Promise<object | null>} Variant ref.
 */
async function findVariantByName(pageRef, variantName) {
  const variantSnap = await buildVariantByNameQuery(pageRef, variantName).get();
  if (variantSnap.empty) {
    return null;
  }
  return variantSnap.docs[0].ref;
}

/**
 * Find option by position.
 * @param {object} variantRef Variant ref.
 * @param {number} optionNumber Option number.
 * @returns {Promise<string | null>} Option path.
 */
async function findOptionByPosition(variantRef, optionNumber) {
  const optionsSnap = await variantRef
    .collection('options')
    .where('position', '==', optionNumber)
    .limit(1)
    .get();
  if (optionsSnap.empty) {
    return null;
  }
  return optionsSnap.docs[0].ref.path;
}

/**
 * Resolve variant and option.
 * @param {object} pageRef Page ref.
 * @param {object} info Info.
 * @returns {Promise<string | null>} Option path.
 */
async function resolveVariantAndOption(pageRef, info) {
  const variantRef = await findVariantByName(pageRef, info.variantName);
  if (!variantRef) {
    return null;
  }
  return findOptionByPosition(variantRef, info.optionNumber);
}

/**
 * Validate inputs.
 * @param {object} db Database.
 * @param {object} info Info.
 * @returns {boolean} True if valid.
 */
function areInputsValid(db, info) {
  return Boolean(db) && Boolean(info);
}

/**
 * Resolve a page reference when the option info is valid.
 * @param {object} db Database.
 * @param {{pageNumber: number}} info Option info carrying the page number.
 * @returns {Promise<object | null>} Page reference or null when not found.
 */
async function resolvePageRefForInfo(db, info) {
  if (!areInputsValid(db, info)) {
    return null;
  }
  return findPageByNumber(db, info.pageNumber);
}

/**
 * Apply a callback when an async resolver produces a value.
 * @param {Promise<*>} resolver Promise resolving to a value or null.
 * @param {(value: *) => Promise<*>} fn Callback invoked with the resolved value.
 * @returns {Promise<*|null>} Callback result or null when resolver yields nothing.
 */
async function whenFound(resolver, fn) {
  const value = await resolver;
  if (!value) {
    return null;
  }
  return fn(value);
}

/**
 * Resolve an option document by page, variant and option indices.
 * @param {object} db Firestore database instance.
 * @param {{pageNumber: number, variantName: string, optionNumber: number}} info
 *   Location details.
 * @returns {Promise<string|null>} Option document path or null when not found.
 */
export async function findExistingOption(db, info) {
  return whenFound(resolvePageRefForInfo(db, info), pageRef =>
    resolveVariantAndOption(pageRef, info)
  );
}

/**
 * Check if page has variants.
 * @param {object} pageRef Page ref.
 * @returns {Promise<boolean>} True if has variants.
 */
async function pageHasVariants(pageRef) {
  const variantsSnap = await pageRef.collection('variants').limit(1).get();
  return !variantsSnap.empty;
}

/**
 * Validate and get page path.
 * @param {object} pageRef Page ref.
 * @returns {Promise<string | null>} Page path.
 */
async function validateAndGetPagePath(pageRef) {
  const hasVariants = await pageHasVariants(pageRef);
  if (!hasVariants) {
    return null;
  }
  return pageRef.path;
}

/**
 * Validate page inputs.
 * @param {object} db Database.
 * @param {number} pageNumber Page number.
 * @returns {boolean} True if valid.
 */
function arePageInputsValid(db, pageNumber) {
  return Boolean(db) && Number.isInteger(pageNumber);
}

/**
 * Resolve a page reference when the page number is valid.
 * @param {object} db Database.
 * @param {number} pageNumber Page number.
 * @returns {Promise<object | null>} Page reference or null when not found.
 */
async function resolvePageRefForNumber(db, pageNumber) {
  if (!arePageInputsValid(db, pageNumber)) {
    return null;
  }
  return findPageByNumber(db, pageNumber);
}

/**
 * Resolve a page document that already has at least one variant.
 * @param {object} db Firestore database instance.
 * @param {number} pageNumber Page number to look up.
 * @returns {Promise<string|null>} Page document path or null when not found.
 */
export async function findExistingPage(db, pageNumber) {
  return whenFound(
    resolvePageRefForNumber(db, pageNumber),
    validateAndGetPagePath
  );
}
