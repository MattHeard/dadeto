function assertFunction(candidate, name) {
  if (typeof candidate !== 'function') {
    throw new TypeError(`${name} must be a function`);
  }
}

function hasVariantString(body) {
  if (!body) {
    return false;
  }

  return typeof body.variant === 'string';
}

function resolveVariant(body) {
  if (!hasVariantString(body)) {
    return '';
  }

  return body.variant.trim();
}

async function handlePostRequest({
  body,
  addModerationReport,
  getServerTimestamp,
}) {
  const variant = resolveVariant(body);

  if (!variant) {
    return {
      status: 400,
      body: 'Missing or invalid variant',
    };
  }

  await addModerationReport({
    variant,
    createdAt: getServerTimestamp(),
  });

  return {
    status: 201,
    body: {},
  };
}

export function createReportForModerationHandler({
  addModerationReport,
  getServerTimestamp,
}) {
  assertFunction(addModerationReport, 'addModerationReport');
  assertFunction(getServerTimestamp, 'getServerTimestamp');

  return async function reportForModerationHandler({ method, body }) {
    if (method !== 'POST') {
      return {
        status: 405,
        body: 'POST only',
      };
    }

    return handlePostRequest({
      body,
      addModerationReport,
      getServerTimestamp,
    });
  };
}

export function createCorsOriginValidator(allowedOrigins) {
  const origins = Array.isArray(allowedOrigins) ? allowedOrigins : [];

  return function corsOriginValidator(origin, cb) {
    if (!origin || origins.includes(origin)) {
      cb(null, true);
    } else {
      cb(new Error('CORS'));
    }
  };
}

export function createCorsOptions({ allowedOrigins, methods = ['POST'] }) {
  const origin = createCorsOriginValidator(allowedOrigins);

  return {
    origin,
    methods,
  };
}

export function createHandleReportForModeration(reportForModerationHandler) {
  assertFunction(reportForModerationHandler, 'reportForModerationHandler');

  return async function handleReportForModeration(req, res) {
    const { status, body } = await reportForModerationHandler({
      method: req?.method,
      body: req?.body,
    });

    if (typeof body === 'string') {
      res.status(status).send(body);
      return;
    }

    if (typeof body === 'undefined') {
      res.sendStatus(status);
      return;
    }

    res.status(status).json(body);
  };
}
