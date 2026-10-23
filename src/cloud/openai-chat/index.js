import { createHash } from 'node:crypto';
import { getAuth } from 'firebase-admin/auth';
import { createBillingRuntime } from '../../core/cloud/billing/billing-runtime-core.js';
import {
  createOpenAIChatHandler,
  createOpenAIChatModelClient,
} from '../../core/cloud/openai-chat/openai-chat-core.js';
import {
  createEffectHttpBoundary,
  createEffectStartupBoundary,
} from '../allow-effects.js';
import { createBillingTransactionRunner } from '../billing/transaction-effect-adapter.js';
import { getAllowedOrigins } from '../cors-config.js';
import { getFirestoreInstance } from '../firestore.js';
import { createOpenAIChatFirestoreAdapters } from './firestore-adapters.js';
import { createOpenAIChatHttpAdapter } from './http-adapter.js';

const db = createEffectStartupBoundary(getFirestoreInstance);
const billingEnabled = process.env.BILLING_ENABLED === 'true';
const billing = createBillingRuntime(db, {
  billingEnabled,
  runBillingTransaction: createBillingTransactionRunner(db),
});
const hashId = value => createHash('sha256').update(value).digest('hex');
const firestore = createOpenAIChatFirestoreAdapters({ db, hashId });
const model = createOpenAIChatModelClient({
  apiKey: process.env.OPENAI_API_KEY ?? '',
  fetchImpl: async (permission, url, options) => {
    void permission;
    return globalThis.fetch(url, options);
  },
  timeoutSignal: milliseconds => AbortSignal.timeout(milliseconds),
});
const handleChat = createOpenAIChatHandler({
  enabled: process.env.OPENAI_CHAT_ENABLED === 'true' && billingEnabled,
  providerReady: Boolean(process.env.OPENAI_API_KEY),
  auth: { verifyIdToken: token => getAuth().verifyIdToken(token) },
  billing,
  ...firestore,
  hashRequest: value =>
    createHash('sha256').update(JSON.stringify(value)).digest('hex'),
  callModel: model,
});
const handle = createEffectHttpBoundary(createOpenAIChatHttpAdapter({
  handleChat,
  allowedOrigins: getAllowedOrigins(process.env),
}));

export { handle };
