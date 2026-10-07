const MAX_ROUND_TRIP_MS = 5000;
const DEFAULT_MAX_AGE_MS = 30000;

/** @typedef {import('../../../../../types/allow-effects').AllowEffects} AllowEffects */

/**
 * Estimate Internet epoch time from an authoritative response and monotonic samples.
 * @param {{serverEpochMs: number, requestStartMs: number, responseEndMs: number}} sample Clock sample.
 * @returns {{serverEpochMs: number, offsetMs: number, uncertaintyMs: number, sampledAtMonotonicMs: number}} Network clock estimate.
 */
export function estimateNetworkClock(sample) {
  const { serverEpochMs, requestStartMs, responseEndMs } = sample;
  if (
    !Number.isFinite(serverEpochMs) ||
    serverEpochMs <= 0 ||
    !Number.isFinite(requestStartMs) ||
    !Number.isFinite(responseEndMs) ||
    requestStartMs < 0 ||
    responseEndMs < requestStartMs
  ) {
    throw new RangeError('Clock sample values must be finite and ordered.');
  }
  const roundTripMs = responseEndMs - requestStartMs;
  if (roundTripMs > MAX_ROUND_TRIP_MS) {
    throw new RangeError('Clock sample round trip exceeds the 5000 ms limit.');
  }
  const midpointMs = requestStartMs + roundTripMs / 2;
  return {
    serverEpochMs,
    offsetMs: serverEpochMs - midpointMs,
    uncertaintyMs: roundTripMs / 2,
    sampledAtMonotonicMs: responseEndMs,
  };
}

/**
 * Read estimated Internet epoch time using only a monotonic elapsed-time source.
 * @param {{serverEpochMs: number, offsetMs: number, uncertaintyMs: number, sampledAtMonotonicMs: number}} estimate Prior server sample.
 * @param {number} monotonicNowMs Current performance-style monotonic value.
 * @param {number} [maxAgeMs] Maximum sample age.
 * @returns {{status: 'synchronized', epochMs: number, uncertaintyMs: number}|{status: 'stale', epochMs: null, uncertaintyMs: null}} Current trusted-time status.
 */
export function readNetworkClock(
  estimate,
  monotonicNowMs,
  maxAgeMs = DEFAULT_MAX_AGE_MS
) {
  if (
    !Number.isFinite(monotonicNowMs) ||
    monotonicNowMs < estimate.sampledAtMonotonicMs
  ) {
    throw new RangeError('Monotonic time must not precede the clock sample.');
  }
  const ageMs = monotonicNowMs - estimate.sampledAtMonotonicMs;
  if (!Number.isFinite(maxAgeMs) || maxAgeMs < 0) {
    throw new RangeError(
      'Maximum clock age must be a non-negative finite number.'
    );
  }
  if (ageMs > maxAgeMs) {
    return { status: 'stale', epochMs: null, uncertaintyMs: null };
  }
  return {
    status: 'synchronized',
    epochMs: estimate.serverEpochMs + estimate.uncertaintyMs + ageMs,
    uncertaintyMs: estimate.uncertaintyMs,
  };
}

/**
 * Request an authoritative epoch sample without reading browser wall time.
 * @param {{fetchImpl: (permission: AllowEffects, ...args: Parameters<typeof globalThis.fetch>) => ReturnType<typeof globalThis.fetch>, bindEffectBoundary: import('../../../../../types/allow-effects').AllowEffectsBoundary, monotonicNow: () => number, endpoint?: string}} options Injected effects.
 * @returns {Promise<ReturnType<typeof estimateNetworkClock>>} Trusted clock estimate.
 */
export async function sampleNetworkClock({
  fetchImpl,
  bindEffectBoundary,
  monotonicNow,
  endpoint = '/api/time',
}) {
  const requestStartMs = monotonicNow();
  const response = await bindEffectBoundary(permission =>
    fetchImpl(permission, endpoint, { cache: 'no-store' })
  );
  if (!response.ok)
    throw new Error(`Clock endpoint returned HTTP ${response.status}.`);
  const payload = await response.json();
  const responseEndMs = monotonicNow();
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new TypeError('Clock endpoint response must be an object.');
  }
  return estimateNetworkClock({
    serverEpochMs: payload.epochMs,
    requestStartMs,
    responseEndMs,
  });
}
