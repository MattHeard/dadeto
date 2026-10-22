import {
  createThreefoldReturnTide,
  advanceThreefoldReturnTide,
  retainThreefoldReturnTideHistory,
} from './return-tide.js';
import { getThreefoldReturnTideFacts } from './return-tide-facts.js';
import { projectThreefoldReturnTide } from './return-tide-projection.js';
import {
  getThreefoldReturnTideInteraction,
  applyThreefoldReturnTideInteraction,
} from './return-tide-interactions.js';

/** @typedef {import('./campaign-outcomes.js').ThreefoldCampaignOutcomes & {returnTide:import('./return-tide.js').ThreefoldReturnTide}} FinaleOutcomes */

/**
 * Initialize one saved tide horizon; legacy history is not fabricated retroactively.
 * @param {import('./campaign-outcomes.js').ThreefoldCampaignOutcomes} outcomes Existing campaign history.
 * @param {{elapsedGameSeconds:number}} clock Shared action clock.
 * @returns {FinaleOutcomes} Actual campaign state with a canonical tide.
 */
export function ensureThreefoldReturnTide(outcomes, clock) {
  return {
    ...outcomes,
    returnTide:
      outcomes.returnTide ||
      createThreefoldReturnTide(clock.elapsedGameSeconds),
  };
}

/**
 * Advance the conserved macro world and its permanent event history together.
 * @param {FinaleOutcomes} outcomes Actual shared world state.
 * @param {import('./return-tide.js').ReturnTideFacts} facts Prior-action regional support.
 * @param {{elapsedGameSeconds:number}} clock Explicit resulting campaign clock.
 * @returns {FinaleOutcomes} Updated actual timeline, separate from public observations.
 */
export function advanceThreefoldFinale(outcomes, facts, clock) {
  return {
    ...outcomes,
    returnTide: advanceThreefoldReturnTide(
      outcomes.returnTide,
      facts,
      clock.elapsedGameSeconds
    ),
  };
}

/**
 * Commit observed device/death facts and project them onto the active region.
 * @param {ReturnType<typeof import('./simulation.js').createThreefoldSimulation>} state Active region.
 * @param {FinaleOutcomes} outcomes Shared physical and observed history.
 * @param {Record<string, any>} runs Actual active/saved regions.
 * @param {import('./pressure-network.js').ThreefoldPressureNetwork} network Existing conserved feeder.
 * @returns {{state:ReturnType<typeof import('./simulation.js').createThreefoldSimulation>,outcomes:FinaleOutcomes}} Permanent history and physical projection.
 */
export function retainAndProjectThreefoldFinale(
  state,
  outcomes,
  runs,
  network
) {
  const facts = getThreefoldReturnTideFacts(
    runs,
    outcomes.returnTide,
    network,
    outcomes.iriFate
  );
  const tide = retainThreefoldReturnTideHistory(outcomes.returnTide, facts);
  return {
    state: projectThreefoldReturnTide(state, tide),
    outcomes: { ...outcomes, returnTide: tide },
  };
}

/**
 * Resolve one currently displayed E affordance before the legacy local reducer.
 * @param {ReturnType<typeof import('./simulation.js').createThreefoldSimulation>} state Active canonical region.
 * @param {FinaleOutcomes} outcomes Actual global history.
 * @param {import('./return-tide.js').ReturnTideFacts} facts Pre-action support.
 * @returns {{handled:boolean,outcomes:FinaleOutcomes,notice:string}} One explicit operation.
 */
export function interactThreefoldFinale(state, outcomes, facts) {
  const interaction = getThreefoldReturnTideInteraction(
    state,
    outcomes.returnTide,
    facts
  );
  if (!interaction) return { handled: false, outcomes, notice: '' };
  const result = applyThreefoldReturnTideInteraction(
    outcomes.returnTide,
    interaction,
    { facts, sceneId: state.scene.id }
  );
  return {
    handled: true,
    outcomes: { ...outcomes, returnTide: result.tide },
    notice: result.notice,
  };
}
