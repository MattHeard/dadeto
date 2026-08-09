import { createBillingController } from '../../src/core/browser/billing/billing-core.js';
import { loadStaticConfig } from './loadStaticConfig.js';
import { getIdToken, initGoogleSignIn } from './googleAuth.js';

const status = document.querySelector('#billing-status');
const packages = document.querySelector('#billing-packages');
const controller = createBillingController({
  loadOffers: async () => fetch((await loadStaticConfig()).billingPackagesUrl).then(response => {
    if (!response.ok) throw new Error('Unable to load billing packages');
    return response.json();
  }),
  getFreshToken: async () => (await getIdToken()) || null,
  signIn: async () => initGoogleSignIn({}),
  createUuid: () => crypto.randomUUID(),
  postCheckout: async (packageId, token, attemptId) => {
    const response = await fetch((await loadStaticConfig()).billingCheckoutUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'Idempotency-Key': attemptId },
      body: JSON.stringify({ packageId }),
    });
    if (!response.ok) throw new Error('Unable to start checkout');
    return response.json();
  },
  navigate: url => location.assign(url),
});

try {
  const offers = await controller.loadOffers();
  status.textContent = '';
  for (const offer of offers) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = `Buy $${(offer.amountUsdMinor / 100).toFixed(2)} (${offer.credits.toLocaleString()} credits)`;
    button.addEventListener('click', async () => {
      button.disabled = true;
      status.textContent = 'Starting checkout…';
      try { await controller.startPurchase(offer.packageId); }
      catch (error) { status.textContent = 'Checkout could not be started. Try again.'; button.disabled = false; }
    });
    packages.append(button);
  }
} catch (error) {
  status.textContent = 'Billing is temporarily unavailable.';
}
