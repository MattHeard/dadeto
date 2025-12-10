import {
  normalizeContent,
  normalizeString,
  normalizeAuthor as normalizeSubmittedAuthor,
} from './cloud-core.js';

/**
 * Normalize incoming option.
 * @param {string} option Raw option.
 * @returns {string} Normalized option.
 */
/**
 * Normalize incoming option.
 * @param {string} option Raw option.
 * @returns {string} Normalized option.
 */
function normalizeIncomingOption(option) {
  return normalizeString(option, 120);
}

/**
 * Normalize page string.
 * @param {string} page Raw page.
 * @returns {string} Normalized page.
 */
function normalizePageStr(page) {
  return normalizeString(page, 120);
}

/**
 * Normalize content.
 * @param {string} content Raw content.
 * @returns {string} Normalized content.
 */
function normalizeContentBody(content) {
  return normalizeContent(content, 10_000);
}

/**
 * Normalize author.
 * @param {string} author Raw author.
 * @returns {string} Normalized author.
 */
function normalizeAuthor(author) {
  return normalizeSubmittedAuthor(author);
}

/**
 * Get raw content.
 * @param {Record<string, unknown>} body Body.
 * @returns {string} Raw content.
 */
function getRawContent(body) {
  return body.content || '';
}

/**
 * Get raw author.
 * @param {Record<string, unknown>} body Body.
 * @returns {string} Raw author.
 */
function getRawAuthor(body) {
  return body.author || '???';
}

/**
 * Get raw values from body.
 * @param {Record<string, unknown>} body Body.
 * @returns {object} Raw values.
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
    incomingOption: normalizeIncomingOption(rawIncomingOption),
    pageStr: normalizePageStr(rawPage),
    content: normalizeContentBody(rawContent),
    author: normalizeAuthor(rawAuthor),
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
 * @param {Function} findExistingOption Finder.
 * @returns {Promise<object>} Result.
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
 * @returns {Promise<{ incomingOptionFullName: string | null, pageNumber: number | null, error?: { status: number, body: { error: string } } }>} Result.
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
 * @param {Function} findExistingPage Finder.
 * @returns {Promise<object>} Result.
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
 * @returns {Promise<{ incomingOptionFullName: string | null, pageNumber: number | null, error?: { status: number, body: { error: string } } }>} Result.
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
 * @param {object} deps Dependencies.
 * @returns {Promise<object>} Result.
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
 * @param {{
 *   incomingOption: string,
 *   pageStr: string,
 *   parseIncomingOption: (option: string) => unknown,
 *   findExistingOption: (option: unknown) => Promise<string | null>,
 *   findExistingPage: (page: number) => Promise<string | null>,
 * }} deps Normalized values and lookup helpers.
 * @returns {Promise<{ incomingOptionFullName: string | null, pageNumber: number | null, error?: { status: number, body: { error: string } } }>} Resolution result including any validation error.
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
 * Get UID from decoded token.
 * @param {object} decoded Decoded token.
 * @returns {string | null} UID.
 */
function getUidFromDecoded(decoded) {
  return decoded.uid ?? null;
}

/**
 * Verify token safely.
 * @param {string} token Token.
 * @param {Function} verifyIdToken Verifier.
 * @returns {Promise<string | null>} UID.
 */
async function verifyTokenSafe(token, verifyIdToken) {
  try {
    const decoded = await verifyIdToken(token);
    return getUidFromDecoded(decoded);
  } catch {
    return null;
  }
}

/**
 * Resolve the optional author identifier from the Authorization header.
 * @param {string} authHeader Authorization header value.
 * @param {(token: string) => Promise<{ uid: string }>} verifyIdToken Firebase token verifier.
 * @returns {Promise<string | null>} Resolved author UID when the token is valid.
 */
async function resolveAuthorId(authHeader, verifyIdToken) {
  const match = authHeader.match(/^Bearer (.+)$/);
  if (!match) {
    return null;
  }
  return verifyTokenSafe(match[1], verifyIdToken);
}

/**
 * Check if option is present.
 * @param {unknown} raw Raw option.
 * @returns {boolean} True if present.
 */
function isOptionPresent(raw) {
  return raw !== undefined && raw !== null;
}

/**
 * Process a single option candidate.
 * @param {Record<string, unknown>} body - Request body.
 * @param {number} index - Option index.
 * @returns {string | null} Normalized option or null.
 */
function processOption(body, index) {
  const raw = body[`option${index}`];
  if (!isOptionPresent(raw)) {
    return null;
  }
  return normalizeString(raw, 120);
}

/**
 * Gather non-empty submission options from the request body.
 * @param {Record<string, unknown>} body Raw request body provided by Express.
 * @returns {string[]} Trimmed option strings provided by the submitter.
 */
function collectOptions(body) {
  return [0, 1, 2, 3].map(i => processOption(body, i)).filter(Boolean);
}

/**
 * Resolve a header getter from the request.
 * @param {object} request - Request object.
 * @returns {(name: string) => string | undefined} Header getter.
 */
function resolveHeaderGetter(request) {
  if (typeof request.get === 'function') {
    return name => request.get(name);
  }
  return () => undefined;
}

/**
 * Save the new page submission.
 * @param {object} deps Dependencies.
 * @param {string} id ID.
 * @param {object} data Data.
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
 * @param {object} deps Dependencies.
 * @param {object} context Context.
 * @returns {Promise<object>} Response.
 */
async function processValidSubmission(deps, context) {
  const { verifyIdToken, randomUUID, saveSubmission, serverTimestamp } = deps;
  const { target, content, author, authHeader, options } = context;

  const authorId = await resolveAuthorId(authHeader, verifyIdToken);
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
 * Get body from request.
 * @param {object} request Request.
 * @returns {object} Body.
 */
function getBody(request) {
  return request.body || {};
}

/**
 * Get auth header.
 * @param {Function} getHeader Getter.
 * @returns {string} Auth header.
 */
function getAuthHeader(getHeader) {
  return getHeader('Authorization') || '';
}

/**
 * Create an HTTP handler that accepts interactive fiction submissions.
 * @param {{
 *   verifyIdToken: (token: string) => Promise<{ uid: string }>,
 *   saveSubmission: (id: string, submission: object) => Promise<void>,
 *   randomUUID: () => string,
 *   serverTimestamp: () => unknown,
 *   parseIncomingOption: (option: string) => unknown,
 *   findExistingOption: (option: unknown) => Promise<string | null>,
 *   findExistingPage: (page: number) => Promise<string | null>,
 * }} deps Functions used to validate and persist the submission.
 * @returns {(request: { body?: object, get?: (name: string) => string | undefined }) => Promise<{ status: number, body: object }>}
 * Submission handler returning HTTP-style responses.
 */
export function createHandleSubmit(deps) {
  const { parseIncomingOption, findExistingOption, findExistingPage } = deps;

  return async function handleSubmit(request) {
    const body = getBody(request);
    const getHeader = resolveHeaderGetter(request);
    const { incomingOption, pageStr, content, author } =
      normalizeSubmissionBody(body);

    const target = await resolveSubmissionTarget({
      incomingOption,
      pageStr,
      parseIncomingOption,
      findExistingOption,
      findExistingPage,
    });

    if (target.error) {
      return target.error;
    }

    return processValidSubmission(deps, {
      target,
      content,
      author,
      authHeader: getAuthHeader(getHeader),
      options: collectOptions(body),
    });
  };
}
