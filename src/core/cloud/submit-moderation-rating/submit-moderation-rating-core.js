const METHOD_NOT_ALLOWED_RESPONSE = { status: 405, body: 'POST only' };
const INVALID_BODY_RESPONSE = {
  status: 400,
  body: 'Missing or invalid isApproved',
};
const MISSING_AUTHORIZATION_RESPONSE = {
  status: 401,
  body: 'Missing or invalid Authorization header',
};
const NO_JOB_RESPONSE = { status: 404, body: 'No moderation job' };

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

function createResponse(status, body) {
  return { status, body };
}

function validateAllowedOrigin(origin, allowedOrigins) {
  if (!origin) {
    return true;
  }

  return allowedOrigins.includes(origin);
}

export function createCorsOptions({ allowedOrigins, methods = ['POST'] }) {
  const origins = Array.isArray(allowedOrigins) ? allowedOrigins : [];

  return {
    origin: (origin, cb) => {
      if (validateAllowedOrigin(origin, origins)) {
        cb(null, true);
      } else {
        cb(new Error('CORS'));
      }
    },
    methods,
  };
}

export function createHandleSubmitModerationRating(responder) {
  assertFunction(responder, 'responder');

  return async function handleSubmitModerationRating(req, res) {
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

function ensureBoolean(value) {
  return typeof value === 'boolean';
}

async function resolveUid(verifyIdToken, token) {
  try {
    const decoded = await verifyIdToken(token);

    if (decoded && typeof decoded.uid === 'string' && decoded.uid) {
      return decoded.uid;
    }
  } catch (err) {
    const message = err?.message || 'Invalid or expired token';
    throw Object.assign(new Error(message), { code: 'invalid-token' });
  }

  throw Object.assign(new Error('Invalid or expired token'), {
    code: 'invalid-token',
  });
}

async function resolveModeratorAssignment(fetchModeratorAssignment, uid) {
  const assignment = await fetchModeratorAssignment(uid);

  if (!assignment) {
    return null;
  }

  const { variantId } = assignment;

  if (typeof variantId !== 'string' || variantId.length === 0) {
    return null;
  }

  const clearAssignment = assignment.clearAssignment;

  return {
    variantId,
    clearAssignment: typeof clearAssignment === 'function' ? clearAssignment : null,
  };
}

export function createSubmitModerationRatingResponder({
  verifyIdToken,
  fetchModeratorAssignment,
  recordModerationRating,
  randomUUID,
  getServerTimestamp,
}) {
  assertFunction(verifyIdToken, 'verifyIdToken');
  assertFunction(fetchModeratorAssignment, 'fetchModeratorAssignment');
  assertFunction(recordModerationRating, 'recordModerationRating');
  assertFunction(randomUUID, 'randomUUID');
  assertFunction(getServerTimestamp, 'getServerTimestamp');

  return async function submitModerationRatingResponder(request = {}) {
    if (normalizeMethod(request.method) !== 'POST') {
      return METHOD_NOT_ALLOWED_RESPONSE;
    }

    const { body = {} } = request;
    const { isApproved } = body;

    if (!ensureBoolean(isApproved)) {
      return INVALID_BODY_RESPONSE;
    }

    const authorizationHeader = getAuthorizationHeader(request);
    const token = extractBearerToken(authorizationHeader);

    if (!token) {
      return MISSING_AUTHORIZATION_RESPONSE;
    }

    let uid;
    try {
      uid = await resolveUid(verifyIdToken, token);
    } catch (err) {
      const message = err?.message || 'Invalid or expired token';
      return createResponse(401, message);
    }

    const assignment = await resolveModeratorAssignment(
      fetchModeratorAssignment,
      uid
    );

    if (!assignment) {
      return NO_JOB_RESPONSE;
    }

    const ratingId = randomUUID();
    await recordModerationRating({
      id: ratingId,
      moderatorId: uid,
      variantId: assignment.variantId,
      isApproved,
      ratedAt: getServerTimestamp(),
    });

    if (assignment.clearAssignment) {
      await assignment.clearAssignment();
    }

    return createResponse(201, {});
  };
}
