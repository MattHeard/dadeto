// @ts-nocheck -- timers and network reads are injected browser boundaries.
/**
 * Create a bounded read-only settlement observer.
 * @param {{ readStatus: () => Promise<{ status: string }>, wait: (ms: number) => Promise<void>, maxAttempts?: number }} deps Polling dependencies.
 * @returns {Promise<{ state: string, status?: object }>}
 */
export async function observeBillingSettlement(deps) {
  const maxAttempts = deps.maxAttempts ?? 5;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const status = await deps.readStatus();
    if (status.status === 'paid' || status.status === 'expired')
      return { state: status.status, status };
    if (attempt + 1 < maxAttempts) await deps.wait(2 ** attempt * 1000);
  }
  return { state: 'delayed' };
}
