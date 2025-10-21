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
 * @returns {(request: { body?: object, get?: (name: string) => string | undefined }) => Promise<{ status: number, body: object }>} Submission handler returning HTTP-style responses.
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
        ? (name) => request.get(name)
        : () => undefined;

    const { incoming_option: rawIncomingOption, page: rawPage } = body;
    let { content = '', author = '???' } = body;
    let authorId = null;

    const incomingOption =
      rawIncomingOption?.toString().trim().slice(0, 120) || '';
    const pageStr = rawPage?.toString().trim().slice(0, 120) || '';
    const hasIncoming = incomingOption !== '';
    const hasPage = pageStr !== '';
    if ((hasIncoming ? 1 : 0) + (hasPage ? 1 : 0) !== 1) {
      return {
        status: 400,
        body: { error: 'must provide exactly one of incoming option or page' },
      };
    }

    content = content.toString().replace(/\r\n?/g, '\n').slice(0, 10_000);
    author = author.toString().trim().slice(0, 120);

    let incomingOptionFullName = null;
    let pageNumber = null;

    if (hasIncoming) {
      const parsed = parseIncomingOption(incomingOption);
      if (!parsed) {
        return { status: 400, body: { error: 'invalid incoming option' } };
      }
      const found = await findExistingOption(parsed);
      if (!found) {
        return { status: 400, body: { error: 'incoming option not found' } };
      }
      incomingOptionFullName = found;
    } else {
      const parsedPage = Number.parseInt(pageStr, 10);
      if (!Number.isInteger(parsedPage)) {
        return { status: 400, body: { error: 'invalid page' } };
      }
      const pagePath = await findExistingPage(parsedPage);
      if (!pagePath) {
        return { status: 400, body: { error: 'page not found' } };
      }
      pageNumber = parsedPage;
    }

    const authHeader = getHeader('Authorization') || '';
    const match = authHeader.match(/^Bearer (.+)$/);
    if (match) {
      try {
        const decoded = await verifyIdToken(match[1]);
        authorId = decoded.uid;
      } catch {
        // ignore invalid token
      }
    }

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

    const id = randomUUID();
    await saveSubmission(id, {
      incomingOptionFullName,
      pageNumber,
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
        incomingOptionFullName,
        pageNumber,
        content,
        author,
        options,
      },
    };
  };
}
