import { functions, express, cors, getEnvironmentVariables } from './realtime-call-gcf.js';
import { getAllowedOrigins } from '../cors-config.js';
import {
  exchangeRealtimeCallSdp as exchangeRealtimeCallSdpCore,
} from './core/realtime/openaiRealtimeCalls.js';

const exchangeRealtimeCallSdp = (body, options = {}) =>
  exchangeRealtimeCallSdpCore(body, {
    ...options,
    fetchImpl: options.fetchImpl ?? globalThis.fetch,
  });

export function createRealtimeCallApp({ exchangeRealtimeCallSdp, allowedOrigins, expressImpl = express, corsImpl = cors }) {
  const app = expressImpl();
  app.use(corsImpl({ origin: createCorsOriginResolver(allowedOrigins), methods: ['POST', 'OPTIONS'] }));
  app.use(expressImpl.text({ type: ['application/sdp', 'text/plain'], limit: '256kb' }));
  app.post('/', createRealtimeCallHandler(exchangeRealtimeCallSdp));
  app.use(handleRealtimeCallError);
  return app;
}

function createCorsOriginResolver(allowedOrigins) {
  return (origin, callback) => (!origin || allowedOrigins.includes(origin) ? callback(null, true) : callback(new Error('CORS')));
}

function createRealtimeCallHandler(exchangeRealtimeCallSdp) {
  return async (req, res, next) => {
    try {
      const { sdpAnswer, location } = await exchangeRealtimeCallSdp(typeof req.body === 'string' ? req.body : '');
      if (location) res.set('Location', location);
      res.type('application/sdp').send(sdpAnswer);
    } catch (error) {
      next(error);
    }
  };
}

function handleRealtimeCallError(error, _req, res) {
  res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown server error' });
}

const environmentVariables = getEnvironmentVariables();
export const realtimeCallApp = createRealtimeCallApp({ exchangeRealtimeCallSdp, allowedOrigins: getAllowedOrigins(environmentVariables) });
export const handle = functions.region('europe-west1').https.onRequest(realtimeCallApp);
