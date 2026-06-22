import { describe, expect, it } from '@jest/globals';
import { readFile } from 'node:fs/promises';

describe('payment-webhook entry point', () => {
  it('exports an HTTP handler that writes the webhook response', async () => {
    const source = await readFile('src/cloud/payment-webhook/index.js', 'utf8');
    expect(source).toContain('export async function handle(req, res)');
    expect(source).toContain('sendPaymentWebhookResponse');
  });
});
