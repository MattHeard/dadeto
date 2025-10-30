/**
 * Normalize submit-new-page request body values.
 * @param {Record<string, unknown>} body Raw request body provided by Express.
 * @returns {{ incomingOption: string, pageStr: string, content: string, author: string }} Sanitized strings extracted from the request body.
 */
function normalizeSubmissionBody(body) {
  const {
    incoming_option: rawIncomingOption,
    page: rawPage,
    content: rawContent = '',
    author: rawAuthor = '???',
  } = body;

  return {
    incomingOption: rawIncomingOption?.toString().trim().slice(0, 120) || '',
    pageStr: rawPage?.toString().trim().slice(0, 120) || '',
    content: rawContent.toString().replace(/\r\n?/g, '\n').slice(0, 10_000),
    author: rawAuthor.toString().trim().slice(0, 120),
  };
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
async function resolveSubmissionTarget({
  incomingOption,
  pageStr,
  parseIncomingOption,
  findExistingOption,
  findExistingPage,
}) {
  const providedSources = [incomingOption !== '', pageStr !== ''].filter(
    Boolean
  ).length;

  if (providedSources !== 1) {
    return {
      error: {
        status: 400,
        body: { error: 'must provide exactly one of incoming option or page' },
      },
    };
  }

  if (incomingOption !== '') {
    const parsed = parseIncomingOption(incomingOption);
    if (!parsed) {
      return {
        error: { status: 400, body: { error: 'invalid incoming option' } },
      };
    }
    const found = await findExistingOption(parsed);
    if (!found) {
      return {
        error: { status: 400, body: { error: 'incoming option not found' } },
      };
    }
    return { incomingOptionFullName: found, pageNumber: null };
  }

  const parsedPage = Number.parseInt(pageStr, 10);
  if (!Number.isInteger(parsedPage)) {
    return { error: { status: 400, body: { error: 'invalid page' } } };
  }
  const pagePath = await findExistingPage(parsedPage);
  if (!pagePath) {
    return { error: { status: 400, body: { error: 'page not found' } } };
  }

  return { incomingOptionFullName: null, pageNumber: parsedPage };
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
  try {
    const decoded = await verifyIdToken(match[1]);
    return decoded.uid ?? null;
  } catch {
    return null;
  }
}

/**
 * Gather non-empty submission options from the request body.
 * @param {Record<string, unknown>} body Raw request body provided by Express.
 * @returns {string[]} Trimmed option strings provided by the submitter.
 */
function collectOptions(body) {
  const options = [];
  for (let i = 0; i < 4; i += 1) {
    const raw = body[`option${i}`];
    if (raw === undefined || raw === null) {
      continue;
    }
    const val = raw.toString().trim().slice(0, 120);
    if (val) {
      options.push(val);
    }
  }
  return options;
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
export function createHandleSubmit({
  verifyIdToken,
  saveSubmission,
  randomUUID,
  serverTimestamp,
  parseIncomingOption,
  findExistingOption,
  findExistingPage,
}) {
  return async function handleSubmit(request) {
    const { body = {} } = request;
    const getHeader =
      typeof request.get === 'function'
        ? name => request.get(name)
        : () => undefined;

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

    const authorId = await resolveAuthorId(
      getHeader('Authorization') || '',
      verifyIdToken
    );
    const options = collectOptions(body);

    const id = randomUUID();
    await saveSubmission(id, {
      incomingOptionFullName: target.incomingOptionFullName,
      pageNumber: target.pageNumber,
      content,
      author,
      authorId,
      options,
      createdAt: serverTimestamp(),
    });

    return {
      status: 201,
      body: {
        id,
        incomingOptionFullName: target.incomingOptionFullName,
        pageNumber: target.pageNumber,
        content,
        author,
        options,
      },
    };
  };
}
