import { getThreefoldCampaignPressureState } from './campaign.js';
import { THREEFOLD_GRAINLANDS_NURSERY_ID } from './grainlands.js';

/**
 * Derive permanent hydraulic inputs from the canonical saved regions.
 * @param {Record<string, any>} runs Active and saved regional simulations.
 * @returns {import('./pressure-network.js').ThreefoldPressureInputs} Observed structural and coordinated relief facts.
 */
export function getThreefoldCampaignPressureInputs(runs) {
  const facts = getThreefoldCampaignPressureState(runs);
  return {
    craneDestroyed:
      runs.belltops?.player.destroyedGeometryIds.includes(
        'belltops-harbor-crane'
      ) || false,
    regulatorFailed: facts.some(
      site => site.id === 'belltops-quay' && site.state === 'damaged'
    ),
    nurseryDamaged:
      runs.grainlands?.player.destroyedGeometryIds.includes(
        THREEFOLD_GRAINLANDS_NURSERY_ID
      ) || false,
    closeHatch: false,
    coordinatedBypass:
      facts.some(
        site =>
          site.id === 'hearthgaps-runoff' && site.state === 'shared-bypass'
      ) &&
      facts.some(
        site => site.id === 'silt-margin-choir' && site.state === 'sent'
      ),
  };
}
