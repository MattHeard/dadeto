const WORLD_ACTIONS = new Set([
  'travel',
  'combat',
  'interaction',
  'wait',
  'failed-action',
]);

/**
 * Create an authored, deterministic crisis clock for one episode.
 * @param {{urgentAtMinutes: number, surgeAtMinutes: number, aftermathAtMinutes: number}} thresholds Game-minute boundaries for the three later stages.
 * @returns {{elapsedMinutes: number, stage: 'rising'|'urgent'|'surge'|'aftermath', thresholds: {urgentAtMinutes: number, surgeAtMinutes: number, aftermathAtMinutes: number}}} New episode clock.
 */
export function createCrisisClock(thresholds) {
  assertThresholds(thresholds);
  return {
    elapsedMinutes: 0,
    stage: 'rising',
    thresholds: { ...thresholds },
  };
}

/**
 * Advance crisis time only for an explicit world action.
 * Menus, pauses, presentation updates, and unrecognized events cannot advance it.
 * @param {ReturnType<typeof createCrisisClock>} clock Current episode clock.
 * @param {{type: string, elapsedGameMinutes?: number}|null|undefined} event Simulation event with its deterministic game-time cost.
 * @returns {ReturnType<typeof createCrisisClock>} Updated clock, or the unchanged clock for non-world and invalid events.
 */
export function advanceCrisisClock(clock, event) {
  assertClock(clock);
  const elapsedGameMinutes = event?.elapsedGameMinutes;
  if (
    !event ||
    typeof event !== 'object' ||
    !WORLD_ACTIONS.has(event.type) ||
    typeof elapsedGameMinutes !== 'number' ||
    !Number.isFinite(elapsedGameMinutes) ||
    elapsedGameMinutes <= 0 ||
    clock.stage === 'aftermath'
  )
    return clock;

  const elapsedMinutes = Math.min(
    clock.thresholds.aftermathAtMinutes,
    clock.elapsedMinutes + elapsedGameMinutes
  );
  return {
    ...clock,
    elapsedMinutes,
    stage: stageAt(elapsedMinutes, clock.thresholds),
    thresholds: { ...clock.thresholds },
  };
}

/**
 * Validate stage thresholds and retain their ordering.
 * @param {{urgentAtMinutes: number, surgeAtMinutes: number, aftermathAtMinutes: number}} thresholds Candidate authored thresholds.
 * @returns {void}
 */
function assertThresholds(thresholds) {
  if (!thresholds || typeof thresholds !== 'object')
    throw new TypeError('Crisis stage thresholds are required.');
  const values = [
    thresholds.urgentAtMinutes,
    thresholds.surgeAtMinutes,
    thresholds.aftermathAtMinutes,
  ];
  if (
    !values.every(value => Number.isFinite(value) && value > 0) ||
    values[0] >= values[1] ||
    values[1] >= values[2]
  )
    throw new RangeError(
      'Crisis thresholds must be positive and strictly increasing.'
    );
}

/**
 * Validate a clock before applying an event.
 * @param {ReturnType<typeof createCrisisClock>} clock Candidate clock state.
 * @returns {void}
 */
function assertClock(clock) {
  if (!clock || typeof clock !== 'object')
    throw new TypeError('A crisis clock is required.');
  assertThresholds(clock.thresholds);
  if (
    !Number.isFinite(clock.elapsedMinutes) ||
    clock.elapsedMinutes < 0 ||
    clock.elapsedMinutes > clock.thresholds.aftermathAtMinutes ||
    clock.stage !== stageAt(clock.elapsedMinutes, clock.thresholds)
  )
    throw new RangeError('Crisis clock state is inconsistent.');
}

/**
 * Resolve the currently reached deterministic hazard stage.
 * @param {number} elapsedMinutes Current in-game time since the crisis began.
 * @param {{urgentAtMinutes: number, surgeAtMinutes: number, aftermathAtMinutes: number}} thresholds Authored stage boundaries.
 * @returns {'rising'|'urgent'|'surge'|'aftermath'} Current stage.
 */
function stageAt(elapsedMinutes, thresholds) {
  if (elapsedMinutes >= thresholds.aftermathAtMinutes) return 'aftermath';
  if (elapsedMinutes >= thresholds.surgeAtMinutes) return 'surge';
  if (elapsedMinutes >= thresholds.urgentAtMinutes) return 'urgent';
  return 'rising';
}
