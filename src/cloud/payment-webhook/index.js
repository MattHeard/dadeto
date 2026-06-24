import { Firestore } from '../get-api-key-credit-v2/get-api-key-credit-v2-gcf.js';
import { createPaymentWebhookIndexHandler } from '../../core/cloud/payment-webhook/payment-webhook-core.js';

const handle = createPaymentWebhookIndexHandler({ firestore: Firestore, env: process.env });

export { handle };
