import { describe, expect, it } from '@jest/globals';

describe('core wrapper exports', () => {
  it('re-exports the cloud implementations', async () => {
    const generateStatsWrapper = await import(
      '../../src/core/generate-stats-core.js'
    );
    const processNewPageWrapper = await import(
      '../../src/core/process-new-page-core.js'
    );
    const submitNewStoryWrapper = await import(
      '../../src/core/submit-new-story-core.js'
    );
    const renderVariantWrapper = await import(
      '../../src/core/render-variant-core.js'
    );
    const paymentWebhookWrapper = await import(
      '../../src/core/payment-webhook-core.js'
    );

    expect(generateStatsWrapper).toHaveProperty('createGenerateStatsCore');
    expect(processNewPageWrapper).toHaveProperty('createProcessNewPageHandler');
    expect(submitNewStoryWrapper).toHaveProperty(
      'createSubmitNewStoryResponder'
    );
    expect(renderVariantWrapper).toHaveProperty('createRenderVariant');
    expect(paymentWebhookWrapper).toHaveProperty('createPaymentWebhookHandler');
  });
});
