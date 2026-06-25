import { describe, expect, it } from '@jest/globals';

describe('core wrapper exports', () => {
  it('re-exports the cloud implementations', async () => {
    const [
      generateStatsWrapper,
      processNewPageWrapper,
      submitNewStoryWrapper,
      renderVariantWrapper,
      paymentWebhookWrapper,
    ] = await Promise.all([
      import('../../src/core/generate-stats-core.js'),
      import('../../src/core/process-new-page-core.js'),
      import('../../src/core/submit-new-story-core.js'),
      import('../../src/core/render-variant-core.js'),
      import('../../src/core/payment-webhook-core.js'),
    ]);

    expect(generateStatsWrapper).toHaveProperty('createGenerateStatsCore');
    expect(processNewPageWrapper).toHaveProperty('createProcessNewPageHandler');
    expect(submitNewStoryWrapper).toHaveProperty('createSubmitNewStoryResponder');
    expect(renderVariantWrapper).toHaveProperty('createRenderVariant');
    expect(paymentWebhookWrapper).toHaveProperty('createPaymentWebhookHandler');
  });
});
