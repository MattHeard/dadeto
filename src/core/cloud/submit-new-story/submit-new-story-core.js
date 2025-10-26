const METHOD_NOT_ALLOWED_RESPONSE = { status: 405, body: 'POST only' };

function assertFunction(candidate, name) {
  if (typeof candidate !== 'function') {
    throw new TypeError(`${name} must be a function`);
  }
}

function normalizeMethod(method) {
  if (typeof method !== 'string') {
    return '';
  }

  return method.toUpperCase();
}

function getAuthorizationHeader(request) {
  if (request && typeof request.get === 'function') {
    const header = request.get('Authorization') ?? request.get('authorization');

    if (typeof header === 'string') {
      return header;
    }
  }

  const headers = request?.headers;
  if (headers && typeof headers === 'object') {
    const header = headers.authorization ?? headers.Authorization;

    if (Array.isArray(header)) {
      return header[0] ?? null;
    }

    if (typeof header === 'string') {
      return header;
    }
  }

  return null;
}

function extractBearerToken(header) {
  if (typeof header !== 'string') {
    return null;
  }

  const match = header.match(/^Bearer (.+)$/);

  return match ? match[1] : null;
}

function normalizeString(value, maxLength) {
  if (typeof value !== 'string') {
    value = value === undefined || value === null ? '' : String(value);
  }

  return value.trim().slice(0, maxLength);
}

function normalizeContent(value, maxLength) {
  const normalized = typeof value === 'string' ? value : String(value ?? '');

  return normalized.replace(/\r\n?/g, '\n').slice(0, maxLength);
}

function collectOptions(body, maxLength) {
  const options = [];

  for (let index = 0; index < 4; index += 1) {
    const key = `option${index}`;
    const raw = body?.[key];

    if (raw === undefined || raw === null) {
      continue;
    }

    const value = normalizeString(raw, maxLength);

    if (value) {
      options.push(value);
    }
  }

  return options;
}

async function resolveAuthorId(request, verifyIdToken) {
  const header = getAuthorizationHeader(request);
  const token = extractBearerToken(header);

  if (!token) {
    return null;
  }

  try {
    const decoded = await verifyIdToken(token);

    if (decoded && typeof decoded.uid === 'string' && decoded.uid) {
      return decoded.uid;
    }
  } catch {
    // ignore invalid tokens
  }

  return null;
}

function createResponse(status, body) {
  return { status, body };
}

export function createCorsOptions({ allowedOrigins, methods = ['POST'] }) {
  const origins = Array.isArray(allowedOrigins) ? allowedOrigins : [];

  return {
    origin: (origin, cb) => {
      if (!origin || origins.includes(origin)) {
        cb(null, true);
      } else {
        cb(new Error('CORS'));
      }
    },
    methods,
  };
}

export function createCorsErrorHandler({
  status = 403,
  body = { error: 'Origin not allowed' },
} = {}) {
  return function corsErrorHandler(err, req, res, next) {
    if (err instanceof Error && err.message === 'CORS') {
      res.status(status).json(body);
      return;
    }

    next(err);
  };
}

export function createHandleSubmitNewStory(responder) {
  assertFunction(responder, 'responder');

  return async function handleSubmitNewStory(req, res) {
    const result = await responder({
      method: req?.method,
      body: req?.body,
      get: typeof req?.get === 'function' ? name => req.get(name) : undefined,
      headers: req?.headers,
    });

    const { status, body } = result;

    if (typeof body === 'object' && body !== null) {
      res.status(status).json(body);
      return;
    }

    if (typeof body === 'undefined') {
      res.sendStatus(status);
      return;
    }

    res.status(status).send(body);
  };
}

export function createSubmitNewStoryResponder({
  verifyIdToken,
  saveSubmission,
  randomUUID,
  getServerTimestamp,
}) {
  assertFunction(verifyIdToken, 'verifyIdToken');
  assertFunction(saveSubmission, 'saveSubmission');
  assertFunction(randomUUID, 'randomUUID');
  assertFunction(getServerTimestamp, 'getServerTimestamp');

  return async function submitNewStoryResponder(request = {}) {
    if (normalizeMethod(request.method) !== 'POST') {
      return METHOD_NOT_ALLOWED_RESPONSE;
    }

    const body = request?.body ?? {};
    const title = normalizeString(body.title ?? 'Untitled', 120);
    const content = normalizeContent(body.content ?? '', 10_000);
    const author = normalizeString(body.author ?? '???', 120);
    const options = collectOptions(body, 120);
    const authorId = await resolveAuthorId(request, verifyIdToken);

    const id = randomUUID();
    await saveSubmission(id, {
      title,
      content,
      author,
      authorId,
      options,
      createdAt: getServerTimestamp(),
    });

    return createResponse(201, {
      id,
      title,
      content,
      author,
      options,
    });
  };
}
