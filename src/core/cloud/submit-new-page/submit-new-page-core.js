import {
  normalizeSubmissionContent,
  normalizeAuthor as normalizeSubmittedAuthor,
} from './cloud-core.js';
import { when } from '../../commonCore.js';
import {
  normalizeShortString,
  resolveAuthorIdFromHeader,
  collectSubmissionOptions,
  getAuthorizationHeader,
} from '../submit-shared.js';

/**
 * @typedef {object} SubmitNewPageRequest
 * @property {Record<string, unknown>} [body] Request body containing submission data.
 * @property {(name: string) => string | undefined} [get] Function to get header values.
 * @typedef {{
 *   rawIncomingOption: unknown;
 *   rawPage: unknown;
 *   rawContent: unknown;
 *   rawAuthor: unknown;
 * }} RawSubmissionValues
 * @typedef {{ incomingOptionFullName: string | null; pageNumber: number | null; error?: undefined }} SubmissionTargetSuccess
 * @typedef {{ error: { status: number; body: { error: string } } }} SubmissionTargetError
 * @typedef {SubmissionTargetSuccess | SubmissionTargetError} SubmissionTargetResult
 * @typedef {{
 *   incomingOption: string;
 *   pageStr: string;
 *   parseIncomingOption: (option: string) => unknown;
 *   findExistingOption: (option: unknown) => Promise<string | null>;
 *   findExistingPage: (page: number) => Promise<string | null>;
 * }} SubmissionTargetDeps
 * @typedef {{
 *   target: SubmissionTargetSuccess;
 *   content: string;
 *   author: string;
 *   authHeader: string;
 *   options: string[];
 * }} SubmitNewPageContext
 * @typedef {{
 *   incomingOptionFullName: string | null;
 *   pageNumber: number | null;
 *   content: string;
 *   author: string;
 *   authorId: string | null;
 *   options: string[];
 * }} SubmitNewPageInput
 * @typedef {SubmitNewPageInput & { createdAt: unknown }} SubmitNewPageRecord
 * @typedef {{
 *   saveSubmission: (id: string, submission: SubmitNewPageRecord) => Promise<void>;
 *   serverTimestamp: () => unknown;
 * }} SubmitNewPageStorageDeps
 * @typedef {{
 *   verifyIdToken: (token: string) => Promise<{ uid: string }>;
 *   saveSubmission: (id: string, submission: SubmitNewPageRecord) => Promise<void>;
 *   randomUUID: () => string;
 *   serverTimestamp: () => unknown;
 *   parseIncomingOption: (option: string) => unknown;
 *   findExistingOption: (option: unknown) => Promise<string | null>;
 *   findExistingPage: (page: number) => Promise<string | null>;
 * }} SubmitNewPageHandlerDeps
 * @typedef {{
 *   incomingOptionFullName: string | null;
 *   pageNumber: number | null;
 *   content: string;
 *   author: string;
 *   authorId: string | null;
 *   options: string[];
 * }} SubmitNewPageData
 */

/**
 * Extract submission content directly from the request body.
 * @param {Record<string, unknown>} body Request payload provided by Express.
 * @returns {string} Raw content string when available.
 */
function getRawContent(body) {
  return String(body.content || '');
}

/**
 * Get raw author.
 * @param {Record<string, unknown>} body Body.
 * @returns {string} Raw author.
 */
function getRawAuthor(body) {
  return String(body.author || '???');
}

/**
 * Get raw values from body.
 * @param {Record<string, unknown>} body Body.
 * @returns {RawSubmissionValues} Raw values.
 */
function getRawValues(body) {
  return {
    rawIncomingOption: body.incoming_option,
    rawPage: body.page,
    rawContent: getRawContent(body),
    rawAuthor: getRawAuthor(body),
  };
}

/**
 * Normalize submit-new-page request body values.
 * @param {Record<string, unknown>} body Raw request body provided by Express.
 * @returns {{ incomingOption: string, pageStr: string, content: string, author: string }} Sanitized strings extracted from the request body.
 */
function normalizeSubmissionBody(body) {
  const { rawIncomingOption, rawPage, rawContent, rawAuthor } =
    getRawValues(body);

  return {
    incomingOption: normalizeShortString(rawIncomingOption),
    pageStr: normalizeShortString(rawPage),
    content: normalizeSubmissionContent(rawContent),
    author: normalizeSubmittedAuthor(rawAuthor),
  };
}

/**
 * Create error response.
 * @param {string} message Message.
 * @returns {{ error: { status: number, body: { error: string } } }} Error.
 */
function createError(message) {
  return {
    error: { status: 400, body: { error: message } },
  };
}

/**
 * Resolve parsed option.
 * @param {unknown} parsed Parsed option.
 * @param {(option: unknown) => Promise<string | null>} findExistingOption Finder.
 * @returns {Promise<SubmissionTargetResult>} Result.
 */
async function resolveParsedOption(parsed, findExistingOption) {
  const found = await findExistingOption(parsed);
  if (!found) {
    return createError('incoming option not found');
  }
  return { incomingOptionFullName: found, pageNumber: null };
}

/**
 * Resolve target when incoming option is provided.
 * @param {string} incomingOption - Option string.
 * @param {(option: string) => unknown} parseIncomingOption - Parser.
 * @param {(option: unknown) => Promise<string | null>} findExistingOption - Finder.
 * @returns {Promise<SubmissionTargetResult>} Result.
 */
async function resolveOptionTarget(
  incomingOption,
  parseIncomingOption,
  findExistingOption
) {
  const parsed = parseIncomingOption(incomingOption);
  if (!parsed) {
    return createError('invalid incoming option');
  }
  return resolveParsedOption(parsed, findExistingOption);
}

/**
 * Validate page number.
 * @param {number} parsedPage Page number.
 * @returns {boolean} True if valid.
 */
function isValidPageNumber(parsedPage) {
  return Number.isInteger(parsedPage);
}

/**
 * Resolve valid page.
 * @param {number} parsedPage Page number.
 * @param {(page: number) => Promise<string | null>} findExistingPage Finder.
 * @returns {Promise<SubmissionTargetResult>} Result.
 */
async function resolveValidPage(parsedPage, findExistingPage) {
  const pagePath = await findExistingPage(parsedPage);
  if (!pagePath) {
    return createError('page not found');
  }

  return { incomingOptionFullName: null, pageNumber: parsedPage };
}

/**
 * Resolve target when page number is provided.
 * @param {string} pageStr - Page string.
 * @param {(page: number) => Promise<string | null>} findExistingPage - Finder.
 * @returns {Promise<SubmissionTargetResult>} Result.
 */
async function resolvePageTarget(pageStr, findExistingPage) {
  const parsedPage = Number.parseInt(pageStr, 10);
  if (!isValidPageNumber(parsedPage)) {
    return createError('invalid page');
  }
  return resolveValidPage(parsedPage, findExistingPage);
}

/**
 * Count provided sources.
 * @param {string} incomingOption Option.
 * @param {string} pageStr Page.
 * @returns {number} Count.
 */
function countSources(incomingOption, pageStr) {
  return [incomingOption !== '', pageStr !== ''].filter(Boolean).length;
}

/**
 * Resolve target based on source.
 * @param {SubmissionTargetDeps} deps Dependencies.
 * @returns {Promise<SubmissionTargetResult>} Result.
 */
async function resolveTargetBySource(deps) {
  const {
    incomingOption,
    pageStr,
    parseIncomingOption,
    findExistingOption,
    findExistingPage,
  } = deps;

  if (incomingOption !== '') {
    return resolveOptionTarget(
      incomingOption,
      parseIncomingOption,
      findExistingOption
    );
  }
  return resolvePageTarget(pageStr, findExistingPage);
}

/**
 * Validate which submission target is provided and resolve its canonical form.
 * @param {SubmissionTargetDeps} deps Normalized values and lookup helpers.
 * @returns {Promise<SubmissionTargetResult>} Resolution result including any validation error.
 */
async function resolveSubmissionTarget(deps) {
  const { incomingOption, pageStr } = deps;
  const providedSources = countSources(incomingOption, pageStr);

  if (providedSources !== 1) {
    return createError('must provide exactly one of incoming option or page');
  }

  return resolveTargetBySource(deps);
}

/**
 * Gather non-empty submission options from the request body.
 * @param {Record<string, unknown>} body Raw request body provided by Express.
 * @returns {string[]} Trimmed option strings provided by the submitter.
 */
function collectOptions(body) {
  return collectSubmissionOptions(body, 120);
}

/**
 * Save the new page submission.
 * @param {SubmitNewPageStorageDeps} deps Dependencies.
 * @param {string} id ID.
 * @param {SubmitNewPageInput} data Data.
 * @returns {Promise<void>} Promise.
 */
async function saveNewPage(deps, id, data) {
  const { saveSubmission, serverTimestamp } = deps;
  await saveSubmission(id, {
    ...data,
    createdAt: serverTimestamp(),
  });
}

/**
 * Process valid submission.
 * @param {SubmitNewPageHandlerDeps} deps Dependencies.
 * @param {SubmitNewPageContext} context Context.
 * @returns {Promise<{ status: number; body: SubmitNewPageData & { id: string } }>} Response.
 */
async function processValidSubmission(deps, context) {
  const { verifyIdToken, randomUUID, saveSubmission, serverTimestamp } = deps;
  const { target, content, author, authHeader, options } = context;

  const authorId = await resolveAuthorIdFromHeader(authHeader, verifyIdToken);
  const id = randomUUID();
  const submissionData = {
    incomingOptionFullName: target.incomingOptionFullName,
    pageNumber: target.pageNumber,
    content,
    author,
    authorId,
    options,
  };

  await saveNewPage({ saveSubmission, serverTimestamp }, id, submissionData);

  return {
    status: 201,
    body: { id, ...submissionData },
  };
}

/**
 * Extract the error response from a target result.
 * @param {SubmissionTargetResult} target Submission target result.
 * @returns {{ status: number; body: { error: string } } | null} Error response or null.
 */
function getTargetError(target) {
  return target.error || null;
}

/**
 * Resolve the final response once the target lookup has completed.
 * @param {{
 *   deps: SubmitNewPageHandlerDeps,
 *   request: SubmitNewPageRequest,
 *   body: Record<string, unknown>,
 *   target: SubmissionTargetResult,
 *   content: string,
 *   author: string
 * }} params Finalization inputs.
 * @returns {Promise<{ status: number; body: SubmitNewPageData & { id: string } }>|{ status: number; body: { error: string } }} Final response.
 */
function finalizeSubmissionResponse(params) {
  const { deps, request, body, target, content, author } = params;
  const targetError = getTargetError(target);
  return /** @type {Promise<{ status: number; body: SubmitNewPageData & { id: string } }>|{ status: number; body: { error: string } }} */ (
    when(
      targetError !== null,
      () => targetError,
      () =>
        processValidSubmission(deps, {
          target,
          content,
          author,
          authHeader: getAuthorizationHeader(request) || '',
          options: collectOptions(body),
        })
    )
  );
}

/**
 * Get body from request.
 * @param {SubmitNewPageRequest} request Request.
 * @returns {Record<string, unknown>} Body.
 */
function getBody(request) {
  return request.body || {};
}

/**
 * Create an HTTP handler that accepts interactive fiction submissions.
 * @param {SubmitNewPageHandlerDeps} deps Functions used to validate and persist the submission.
 * @returns {(request: SubmitNewPageRequest) => Promise<{ status: number, body: object }>}
 * Submission handler returning HTTP-style responses.
 */
export function createHandleSubmit(deps) {
  const { parseIncomingOption, findExistingOption, findExistingPage } = deps;

  /**
   * Handle an incoming submission request.
   * @param {SubmitNewPageRequest} request Request object.
   * @returns {Promise<{ status: number; body: SubmitNewPageData & { id: string } | { error: string } }>} Response object.
   */
  return async function handleSubmit(request) {
    const body = getBody(request);
    const { incomingOption, pageStr, content, author } =
      normalizeSubmissionBody(body);

    const target = await resolveSubmissionTarget({
      incomingOption,
      pageStr,
      parseIncomingOption,
      findExistingOption,
      findExistingPage,
    });
    return finalizeSubmissionResponse({
      deps,
      request,
      body,
      target,
      content,
      author,
    });
  };
}
