import { onRequest, express, cors, getEnvironmentVariables } from './realtime-call-v2-gcf.js';
import { getAllowedOrigins } from '../cors-config.js';
import { createEffectInvocationBoundary, createEffectStartupBoundary } from '../allow-effects.js';
import { requireAllowEffects } from '../../adapters/allow-effects.js';
import { exchangeRealtimeCallSdp } from '../../core/realtime/openaiRealtimeCalls.js';
import { createRealtimeCallRun } from '../../core/cloud/realtime-call/run.js';
import {
  forwardRealtimeError,
  registerRealtimeErrorHandler,
  registerRealtimeFunction,
  registerRealtimePostRoute,
  sendRealtimeAnswer,
  sendRealtimeError,
  useRealtimeMiddleware,
} from './effect-adapters.js';

const runtime = createEffectStartupBoundary(allowEffects =>
  createRealtimeCallRun(allowEffects, {
    onRequest,
    express,
    cors,
    allowedOrigins: getAllowedOrigins(getEnvironmentVariables()),
    exchangeRealtimeCallSdp: body =>
      exchangeRealtimeCallSdp(body, {
        fetchImpl: requireAllowEffects(globalThis.fetch.bind(globalThis)),
        bindEffectBoundary: handler => createEffectInvocationBoundary(handler)(),
      }),
    bindRequestBoundary: createEffectInvocationBoundary,
    useMiddleware: useRealtimeMiddleware,
    registerPostRoute: registerRealtimePostRoute,
    registerErrorHandler: registerRealtimeErrorHandler,
    registerFunction: registerRealtimeFunction,
    sendAnswer: sendRealtimeAnswer,
    forwardError: forwardRealtimeError,
    sendError: sendRealtimeError,
  })
);

export const realtimeCallApp = runtime.app;
export const handle = runtime.handle;
