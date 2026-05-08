import {
  functions,
  express,
  cors,
  getEnvironmentVariables,
} from './realtime-call-gcf.js';
import { getAllowedOrigins } from '../cors-config.js';
import { exchangeRealtimeCallSdp } from '../../core/realtime/openaiRealtimeCalls.js';

/**
 * Create the cloud Realtime SDP relay app.
 * @param {{
 *   exchangeRealtimeCallSdp: (sdpOffer: string) => Promise<{sdpAnswer: string, location?: string}>,
 *   allowedOrigins: string[],
 *   expressImpl?: typeof express,
 *   corsImpl?: typeof cors,
 * }} deps Cloud relay dependencies.
 * @returns {express.Express} Configured Express app.
 */
export function createRealtimeCallApp({
  exchangeRealtimeCallSdp,
  allowedOrigins,
  expressImpl = express,
  corsImpl = cors,
}) {
  const app = expressImpl();
  app.use(
    corsImpl({
      origin: createCorsOriginResolver(allowedOrigins),
      methods: ['POST', 'OPTIONS'],
    })
  );
  app.use(expressImpl.text({ type: ['application/sdp', 'text/plain'], limit: '256kb' }));
  app.post('/', createRealtimeCallHandler(exchangeRealtimeCallSdp));
  app.use(handleRealtimeCallError);
  return app;
}

/**
 * Create a CORS origin resolver for the Realtime relay.
 * @param {string[]} allowedOrigins Allowed browser origins.
 * @returns {(origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) => void} CORS origin callback.
 */
function createCorsOriginResolver(allowedOrigins) {
  return (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error('CORS'));
  };
}

/**
 * Create the SDP relay request handler.
 * @param {(sdpOffer: string) => Promise<{sdpAnswer: string, location?: string}>} exchangeRealtimeCallSdp SDP exchange dependency.
 * @returns {import('express').RequestHandler} Express request handler.
 */
function createRealtimeCallHandler(exchangeRealtimeCallSdp) {
  return async (req, res, next) => {
    try {
      const { sdpAnswer, location } = await exchangeRealtimeCallSdp(
        getSdpOfferBody(req.body)
      );
      setLocationHeader(res, location);
      res.type('application/sdp').send(sdpAnswer);
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Normalize the SDP offer body read by express.text.
 * @param {unknown} body Request body.
 * @returns {string} SDP offer body.
 */
function getSdpOfferBody(body) {
  if (typeof body === 'string') {
    return body;
  }

  return '';
}

/**
 * Set Location response header when OpenAI returns one.
 * @param {import('express').Response} res Express response.
 * @param {string | undefined} location Optional location header.
 * @returns {void}
 */
function setLocationHeader(res, location) {
  if (location) {
    res.set('Location', location);
  }
}

/**
 * Return a safe error response without exposing server credentials.
 * @param {unknown} error Caught error.
 * @param {import('express').Request} _req Express request.
 * @param {import('express').Response} res Express response.
 * @param {import('express').NextFunction} _next Express next callback.
 * @returns {void}
 */
function handleRealtimeCallError(error, _req, res, _next) {
  res.status(500).json({
    error: error instanceof Error ? error.message : 'Unknown server error',
  });
}

const environmentVariables = getEnvironmentVariables();
const allowedOrigins = getAllowedOrigins(environmentVariables);

export const realtimeCallApp = createRealtimeCallApp({
  exchangeRealtimeCallSdp,
  allowedOrigins,
});

export const realtimeCall = functions
  .region('europe-west1')
  .https.onRequest(realtimeCallApp);
