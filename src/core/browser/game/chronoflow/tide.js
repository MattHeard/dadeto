/** @type {Array<'rising'|'high'|'falling'|'low'>} */
const TIDE_PHASES = ['rising', 'high', 'falling', 'low'];

/**
 * Resolve a tide phase from an explicitly supplied trusted epoch.
 * @param {number} epochMs Trusted Internet epoch milliseconds.
 * @param {number} [periodMs] Full tide cycle duration.
 * @returns {'rising'|'high'|'falling'|'low'} Current deterministic phase.
 */
export function getTidePhase(epochMs, periodMs = 120000) {
  if (!Number.isFinite(epochMs) || epochMs < 0) {
    throw new RangeError('Tide epoch must be a non-negative finite number.');
  }
  if (!Number.isSafeInteger(periodMs) || periodMs < TIDE_PHASES.length) {
    throw new RangeError(
      'Tide period must be a safe integer of at least 4 ms.'
    );
  }
  const phaseDurationMs = periodMs / TIDE_PHASES.length;
  const phaseIndex = Math.floor((epochMs % periodMs) / phaseDurationMs);
  return TIDE_PHASES[phaseIndex];
}

/**
 * Check a timed puzzle window using an explicit trusted-clock reading.
 * @param {{clockStatus: 'synchronized'|'stale'|'offline', epochMs: number|null, uncertaintyMs?: number, requiredPhase?: 'rising'|'high'|'falling'|'low', periodMs?: number}} input Trusted clock and level window.
 * @returns {boolean} Whether timed play is allowed in the requested tide phase.
 */
export function isTideWindowOpen({
  clockStatus,
  epochMs,
  uncertaintyMs = 0,
  requiredPhase = 'high',
  periodMs = 120000,
}) {
  if (
    clockStatus !== 'synchronized' ||
    typeof epochMs !== 'number' ||
    !Number.isFinite(epochMs) ||
    !Number.isFinite(uncertaintyMs) ||
    uncertaintyMs < 0
  ) {
    return false;
  }
  getTidePhase(epochMs, periodMs);
  const phaseDurationMs = periodMs / TIDE_PHASES.length;
  if (uncertaintyMs * 2 >= phaseDurationMs) return false;
  /**
   * @param {number} instant Epoch sample to classify.
   * @returns {'rising'|'high'|'falling'|'low'} Sample phase.
   */
  const phaseAt = instant => {
    const normalized = ((instant % periodMs) + periodMs) % periodMs;
    return TIDE_PHASES[Math.floor(normalized / phaseDurationMs)];
  };
  return (
    phaseAt(epochMs - uncertaintyMs) === requiredPhase &&
    phaseAt(epochMs + uncertaintyMs) === requiredPhase
  );
}
