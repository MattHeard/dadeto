import { observeBillingSettlement } from '../../src/core/browser/billing/billing-return-core.js';
import { loadStaticConfig } from './loadStaticConfig.js';
import { getIdToken, initGoogleSignIn } from './googleAuth.js';

const statusElement = document.querySelector('#billing-status');
const sessionId = new URLSearchParams(location.search).get('session_id');
if (!sessionId) statusElement.textContent = 'This confirmation link is missing its session.';
else {
  const readStatus = async () => {
    const token = await getIdToken();
    if (!token) { await initGoogleSignIn({}); }
    const config = await loadStaticConfig();
    const response = await fetch(`${config.billingPurchaseStatusUrl}?session_id=${encodeURIComponent(sessionId)}`, { headers: { Authorization: `Bearer ${(await getIdToken()) || ''}` } });
    if (!response.ok) throw new Error('Unable to read purchase status');
    return response.json();
  };
  try {
    const result = await observeBillingSettlement({ readStatus, wait: ms => new Promise(resolve => setTimeout(resolve, ms)) });
    statusElement.textContent = result.state === 'paid' ? 'Payment confirmed and credits issued.' : result.state === 'expired' ? 'This checkout session expired.' : 'Payment confirmation is taking longer than expected. You can safely leave this page and check your billing balance later.';
  } catch { statusElement.textContent = 'Unable to confirm this payment right now.'; }
}
