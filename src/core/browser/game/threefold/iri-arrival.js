import { getThreefoldGateOutcome } from './outcome.js';
import { hasThreefoldQuayIriDeath } from './quay-regulator.js';
import * as outcomes from './campaign-outcomes.js';
import {
  advanceThreefoldCampaignClock,
  normalizeThreefoldElapsedGameSeconds,
} from './campaign-clock.js';
import { advanceThreefoldPressureNetwork } from './pressure-network.js';
import { getThreefoldCampaignPressureInputs } from './campaign-pressure.js';

export const THREEFOLD_IRI_SURGE_SECONDS = 540;
export const THREEFOLD_IRI_AFTERMATH_SECONDS = 900;

/** @typedef {{clock: {elapsedGameSeconds: number}, outcomes: outcomes.ThreefoldCampaignOutcomes, network: import('./pressure-network.js').ThreefoldPressureNetwork}} ArrivalCampaign */

/**
 * Cross authored tide milestones using prior-action facts and conserved flow.
 * The caller advances remaining flow after applying the current world action.
 * Legacy saves past a missed milestone are not backfilled with invented facts.
 * @param {ArrivalCampaign} campaign Canonical shared physical timeline.
 * @param {Record<string, any>} runs Regional facts before the current action.
 * @param {number} durationSeconds Explicit game-action duration.
 * @returns {ArrivalCampaign & {remainingSeconds: number}} Event changes and remaining hydraulic duration.
 */
export function advanceThreefoldIriArrival(campaign, runs, durationSeconds) {
  normalizeThreefoldElapsedGameSeconds(durationSeconds, 'Iri arrival');
  const clock = advanceThreefoldCampaignClock(campaign.clock, durationSeconds);
  let cursor = campaign.clock.elapsedGameSeconds;
  let next = campaign;
  for (const milestone of [
    THREEFOLD_IRI_SURGE_SECONDS,
    THREEFOLD_IRI_AFTERMATH_SECONDS,
  ]) {
    if (milestone <= cursor || milestone > clock.elapsedGameSeconds) continue;
    const network = advanceThreefoldPressureNetwork(
      next.network,
      getThreefoldCampaignPressureInputs(runs),
      milestone - cursor
    );
    next = resolveArrivalMilestone({ ...next, network }, runs, milestone);
    cursor = milestone;
  }
  return {
    ...next,
    clock,
    remainingSeconds: clock.elapsedGameSeconds - cursor,
  };
}

/**
 * Freeze a physical outcome at its actual milestone, preserving last knowledge.
 * @param {ArrivalCampaign} campaign Current physical and knowledge state.
 * @param {Record<string, any>} runs Facts established before the milestone.
 * @param {number} milestone Tide event time.
 * @returns {ArrivalCampaign} Updated event or unchanged terminal outcome.
 */
function resolveArrivalMilestone(campaign, runs, milestone) {
  const fate = campaign.outcomes.iriFate;
  if (
    !fate &&
    (campaign.network.operatorReleased ||
      (runs.belltops && hasThreefoldQuayIriDeath(runs.belltops)))
  )
    return campaign;
  if (
    fate &&
    ['rescued', 'escaped', 'evacuated', 'dead'].includes(fate.outcome)
  )
    return campaign;
  const resolution = arrivalResolution(campaign.network, runs, milestone);
  if (!resolution || fate?.outcome === resolution.outcome) return campaign;
  const recorded = outcomes.recordThreefoldIriFate(campaign.outcomes, {
    outcome: resolution.outcome,
    milestoneId: resolution.milestoneId,
    elapsedGameSeconds: milestone,
  });
  if (recorded.iriFate?.outcome !== resolution.outcome) return campaign;
  const known = outcomes.getKnownThreefoldIriFate(campaign.outcomes);
  return {
    ...campaign,
    network: { ...campaign.network, ...resolution.machinery },
    outcomes: outcomes.createThreefoldCampaignOutcomes(
      recorded.iriFate,
      known,
      campaign.outcomes.returnTide
    ),
  };
}

/**
 * Match concrete relief, surviving crew and failed-gate facts to an arrival.
 * @param {import('./pressure-network.js').ThreefoldPressureNetwork} network Existing machinery and relief.
 * @param {Record<string, any>} runs Previously committed regional state.
 * @param {number} milestone Authored tide milestone.
 * @returns {{outcome: outcomes.ThreefoldIriOutcome, milestoneId: string, machinery: Partial<import('./pressure-network.js').ThreefoldPressureNetwork>}|null} Physical event.
 */
function arrivalResolution(network, runs, milestone) {
  if (network.governorState === 'installed' && !network.regulatorFailed)
    return {
      outcome: 'escaped',
      milestoneId: 'quay-fitted-governor-escape',
      machinery: { operatorReleased: true },
    };
  if (network.bypassOpen)
    return {
      outcome: 'escaped',
      milestoneId: 'quay-relief-escape',
      machinery: { operatorReleased: true },
    };
  if (
    hasSurvivingFerryEngineer(runs['broken-gate']) &&
    network.governorState === 'crane' &&
    !network.craneDestroyed &&
    !network.regulatorFailed
  )
    return {
      outcome: 'evacuated',
      milestoneId: 'quay-engineer-crane-evacuation',
      machinery: { operatorReleased: true, governorState: 'installed' },
    };
  if (
    milestone === THREEFOLD_IRI_AFTERMATH_SECONDS &&
    hasUncheckedGate(runs['broken-gate'])
  )
    return {
      outcome: 'dead',
      milestoneId: 'quay-unchecked-gate-surge',
      machinery: { regulatorFailed: true },
    };
  if (milestone === THREEFOLD_IRI_SURGE_SECONDS)
    return {
      outcome: 'abandoned',
      milestoneId: 'quay-support-withdrawal',
      machinery: {},
    };
  return null;
}

/**
 * A directly evacuated first group or a timely repaired ferry preserves its engineer.
 * @param {any} gate Saved Broken Gate simulation.
 * @returns {boolean} Whether the ferry engineer can join the harbor crew.
 */
function hasSurvivingFerryEngineer(gate) {
  return (
    ['partial', 'evacuated'].includes(gate?.episode.passengers) ||
    (gate?.episode.gateRepairedBeforeSurge === true &&
      gate.episode.ferry === 'afloat')
  );
}

/**
 * Respect the actual repair reducer and every canonical forced-gate component.
 * @param {any} gate Prior committed Broken Gate simulation.
 * @returns {boolean} Whether the surge still has a forced, unrepaired path.
 */
function hasUncheckedGate(gate) {
  return Boolean(
    gate && getThreefoldGateOutcome(gate).gateState === 'forced-open'
  );
}
