import { assertFunction } from './cloud-core.js';

/**
 * Determine whether the provided request body contains a variant string.
 * @param {{ variant?: unknown } | null | undefined} body Request payload to inspect.
 * @returns {boolean} True when a string variant is present.
 */
function hasVariantString(body) {
  if (!body) {
    return false;
  }

  return typeof body.variant === 'string';
}

/**
 * Safely extract the trimmed variant string from a request body.
 * @param {{ variant?: unknown } | null | undefined} body Request payload containing the variant field.
 * @returns {string} Trimmed variant string, or an empty string when not provided.
 */
function resolveVariant(body) {
  if (!hasVariantString(body)) {
    return '';
  }

  return body.variant.trim();
}

/**
 * Handle a POST request for creating a moderation report.
 * @param {object} root0 Dependencies for handling the request.
 * @param {{ variant?: unknown } | null | undefined} root0.body Request payload sent by the client.
 * @param {(report: { variant: string, createdAt: unknown }) => Promise<void> | void} root0.addModerationReport Persist a new moderation report record.
 * @param {() => unknown} root0.getServerTimestamp Provide a timestamp used when storing the report.
 * @returns {Promise<{ status: number, body: string | Record<string, unknown> }>} Response details consumed by the HTTP adapter.
 */
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

/**
 * Build an HTTP handler that accepts moderation report submissions.
 * @param {object} root0 Dependencies required to process requests.
 * @param {(report: { variant: string, createdAt: unknown }) => Promise<void> | void} root0.addModerationReport Function used to persist new reports.
 * @param {() => unknown} root0.getServerTimestamp Retrieve the timestamp for stored reports.
 * @returns {(request: { method?: string, body?: { variant?: unknown } | null }) => Promise<{ status: number, body: string | Record<string, unknown> }>} Request handler that returns status and body details.
 */
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

/**
 * Create a validator that enforces an allow-list of origins for CORS.
 * @param {string[] | null | undefined} allowedOrigins Origins that may access the endpoint.
 * @returns {(origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) => void} Validation callback compatible with the CORS package.
 */
export function createCorsOriginValidator(allowedOrigins) {
  let origins;
  if (Array.isArray(allowedOrigins)) {
    origins = allowedOrigins;
  } else {
    origins = [];
  }

  return function corsOriginValidator(origin, cb) {
    if (!origin || origins.includes(origin)) {
      cb(null, true);
    } else {
      cb(new Error('CORS'));
    }
  };
}

/**
 * Create configuration suitable for initializing CORS middleware.
 * @param {object} root0 Options controlling the generated configuration.
 * @param {string[] | null | undefined} root0.allowedOrigins Origins that are permitted when validating requests.
 * @param {string[]} [root0.methods] HTTP methods supported by the endpoint. Defaults to ['POST'].
 * @returns {{ origin: (origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) => void, methods: string[] }} Config object consumed by the CORS middleware.
 */
export function createCorsOptions({ allowedOrigins, methods = ['POST'] }) {
  const origin = createCorsOriginValidator(allowedOrigins);

  return {
    origin,
    methods,
  };
}

/**
 * Wrap the domain handler in an Express-style request handler.
 * @param {(request: { method?: string, body?: { variant?: unknown } | null }) => Promise<{ status: number, body: string | Record<string, unknown> }>} reportForModerationHandler Domain-specific request handler.
 * @returns {(req: { method?: string, body?: { variant?: unknown } | null }, res: { status: (code: number) => { send: (body: string) => void, json: (body: Record<string, unknown>) => void }, sendStatus: (code: number) => void }) => Promise<void>} Express-compatible request handler that writes to the provided response.
 */
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
