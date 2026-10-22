import { THREEFOLD_GRAINLANDS_NURSERY_ID } from './grainlands.js';
import { THREEFOLD_BELLTOPS_IRI_ID } from './belltops.js';
import { hasThreefoldQuayIriDeath } from './quay-regulator.js';
/**
 * Keep a region reload or reset consistent with permanent campaign structures.
 * @param {any} state Current region.
 * @param {import('./pressure-network.js').ThreefoldPressureNetwork} pressureNetwork Shared permanent machinery.
 * @returns {any} Projected region.
 */
function projectThreefoldPressureDamage(state, pressureNetwork) {
  const damage = [
    {
      sceneId: 'belltops',
      id: 'belltops-pressure-regulator',
      active: pressureNetwork.regulatorFailed,
    },
    {
      sceneId: 'belltops',
      id: 'belltops-harbor-crane',
      active: pressureNetwork.craneDestroyed,
    },
    {
      sceneId: 'grainlands',
      id: THREEFOLD_GRAINLANDS_NURSERY_ID,
      active: pressureNetwork.nurseryDamaged,
    },
  ].filter(
    item =>
      item.sceneId === state.scene.id &&
      item.active &&
      !state.player.destroyedGeometryIds.includes(item.id)
  );
  if (damage.length === 0) return state;
  state = {
    ...state,
    player: {
      ...state.player,
      destroyedGeometryIds: [
        ...state.player.destroyedGeometryIds,
        ...damage.map(item => item.id),
      ].sort(),
    },
  };
  return state;
}

/**
 * Keep departed Iri out of later collision previews without inventing a death.
 * Preserve a locally recorded growth corpse; a region reset cannot revive it.
 * @param {any} state Current region.
 * @param {import('./pressure-network.js').ThreefoldPressureNetwork} pressureNetwork Shared permanent machinery.
 * @param {ReturnType<typeof import('./campaign-outcomes.js').createThreefoldCampaignOutcomes>} campaignOutcomes Saved character fate.
 * @returns {any} Projected region.
 */
function projectThreefoldCampaignIri(state, pressureNetwork, campaignOutcomes) {
  const fate = campaignOutcomes.iriFate;
  if (!fate && !pressureNetwork.operatorReleased) return state;
  const outcome = fate?.outcome || '';
  const hasLocalDeath = hasThreefoldQuayIriDeath(state);
  const departed =
    pressureNetwork.operatorReleased ||
    ['rescued', 'escaped', 'evacuated'].includes(outcome) ||
    (outcome === 'dead' && !hasLocalDeath);
  if (!departed) return state;
  const residents = /** @type {Array<{id: string}>} */ (state.scene.creatures);
  const creatures = residents.filter(
    creature => creature.id !== THREEFOLD_BELLTOPS_IRI_ID
  );
  if (creatures.length === state.scene.creatures.length) return state;
  state = /** @type {typeof state} */ ({
    ...state,
    scene: { ...state.scene, creatures },
  });
  return state;
}

/**
 * Project permanent campaign damage and departures onto the active region.
 * @param {any} state Current region.
 * @param {import('./pressure-network.js').ThreefoldPressureNetwork} network Shared machinery.
 * @param {ReturnType<typeof import('./campaign-outcomes.js').createThreefoldCampaignOutcomes>} outcomes Character fate.
 * @returns {any} Projected region without new campaign decisions.
 */
export function projectThreefoldCampaignState(state, network, outcomes) {
  return projectThreefoldCampaignIri(
    projectThreefoldPressureDamage(state, network),
    network,
    outcomes
  );
}
