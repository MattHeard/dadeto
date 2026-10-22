import {
  THREEFOLD_BELLTOPS_CRANE_DRIVE_ID,
  THREEFOLD_BELLTOPS_PRESSURE_REGULATOR_ID,
  THREEFOLD_BELLTOPS_IRI_ID,
} from './belltops.js';
import { isThreefoldInteractableInReach } from './scene-utils.js';

/** @typedef {{scene: {id: string, interactables: Array<{id: string, position: {x: number, y: number}}>, creatures: Array<{id: string}>}, player: {position: {x: number, y: number}, destroyedGeometryIds: string[]}, encounter: {growthDeaths?: Array<{creatureId: string}>}}} QuaySceneState */
/** @typedef {'inspect'|'recover-governor'|'install-governor'|'rescue'} QuayActionKind */
/** @typedef {{kind: QuayActionKind, label: string, hud: string, detail: string, targetId: string}} QuayInteraction */

const ACTIONS = {
  inspect: {
    label: 'CHECK IRI',
    hud: 'E CHECK IRI · CRANE HAS A GOVERNOR',
    detail:
      'Iri is holding the manual regulator. Check the panel before attempting a handoff.',
  },
  'recover-governor': {
    label: 'TAKE GOVERNOR',
    hud: 'E TAKE GOVERNOR · CRANE WILL STOP',
    detail:
      'Taking the crane governor permanently disables harbor lifting. Carry it to the Quay panel to replace Iri at the regulator.',
  },
  'install-governor': {
    label: 'FIT GOVERNOR',
    hud: 'E FIT GOVERNOR · CRANE STAYS IDLE',
    detail:
      'Fit the carried governor at the intact regulator. It will hold the nursery feed when Iri leaves; the crane remains unavailable.',
  },
  rescue: {
    label: 'RELEASE IRI',
    hud: 'E RELEASE IRI · CHECK FEEDER RISK',
    detail:
      'Release Iri from the regulator. Without a fitted governor, the feeder will open toward Grainlands. Earlier hatch and relief work can mitigate the water, but cannot undo flood damage.',
  },
};

/**
 * Select the nearest physically reachable, currently possible Quay action.
 * @param {ReturnType<typeof import('./simulation.js').createThreefoldSimulation>} state Canonical active simulation.
 * @param {import('./pressure-network.js').ThreefoldPressureNetwork} network Shared machinery and water.
 * @param {import('./campaign-outcomes.js').ThreefoldIriFate|null} iriFate Known campaign fate.
 * @returns {QuayInteraction|null} Context action or null outside physical reach.
 */
export function getThreefoldQuayInteraction(state, network, iriFate) {
  if (state.scene.id !== 'belltops') return null;
  const panelKind = quayPanelAction(state, network, iriFate);
  const driveAvailable =
    network.governorState === 'crane' &&
    !network.craneDestroyed &&
    !state.player.destroyedGeometryIds.includes('belltops-harbor-crane');
  const candidates = state.scene.interactables
    .map(target => ({
      target,
      kind:
        target.id === THREEFOLD_BELLTOPS_PRESSURE_REGULATOR_ID
          ? panelKind
          : target.id === THREEFOLD_BELLTOPS_CRANE_DRIVE_ID && driveAvailable
            ? 'recover-governor'
            : null,
      distance: Math.hypot(
        state.player.position.x - target.position.x,
        state.player.position.y - target.position.y
      ),
    }))
    .filter(
      candidate =>
        candidate.kind &&
        isThreefoldInteractableInReach(state, candidate.target.id)
    )
    .sort((a, b) => a.distance - b.distance);
  const selected = candidates[0];
  if (!selected) return null;
  const kind = /** @type {QuayActionKind} */ (selected.kind);
  const copy = ACTIONS[kind];
  if (kind === 'rescue' && network.governorState === 'installed')
    return {
      kind,
      targetId: selected.target.id,
      label: copy.label,
      hud: 'E RELEASE IRI · GOVERNOR HOLDS',
      detail:
        'Release Iri safely: the fitted governor holds the nursery feed. The harbor crane remains disabled.',
    };
  return { kind, targetId: selected.target.id, ...copy };
}

/**
 * Determine the intact panel's next available operation without inventing Iri.
 * @param {ReturnType<typeof import('./simulation.js').createThreefoldSimulation>} state Canonical Belltops scene.
 * @param {import('./pressure-network.js').ThreefoldPressureNetwork} network Shared machinery.
 * @param {import('./campaign-outcomes.js').ThreefoldIriFate|null} iriFate Known character outcome.
 * @returns {QuayActionKind|null} Panel action if its physical prerequisites hold.
 */
function quayPanelAction(state, network, iriFate) {
  if (state.player.destroyedGeometryIds.includes('belltops-pressure-regulator'))
    return null;
  const departed =
    iriFate &&
    ['rescued', 'escaped', 'evacuated', 'dead'].includes(iriFate.outcome);
  const hasLivingIri =
    !network.operatorReleased &&
    !departed &&
    state.scene.creatures.some(
      creature => creature.id === THREEFOLD_BELLTOPS_IRI_ID
    ) &&
    !hasThreefoldQuayIriDeath(state);
  if (hasLivingIri && !iriFate) return 'inspect';
  if (network.governorState === 'carried') return 'install-governor';
  return hasLivingIri ? 'rescue' : null;
}

/**
 * Commit one currently reachable operation; persistence belongs to the runtime.
 * @param {ReturnType<typeof import('./simulation.js').createThreefoldSimulation>} state Active simulation before the action.
 * @param {import('./pressure-network.js').ThreefoldPressureNetwork} network Shared physical state.
 * @param {import('./campaign-outcomes.js').ThreefoldIriFate|null} iriFate Known campaign fate.
 * @returns {{network: import('./pressure-network.js').ThreefoldPressureNetwork, outcome: 'trapped'|'rescued'|null, milestoneId: string}|null} Authored action result.
 */
export function applyThreefoldQuayInteraction(state, network, iriFate) {
  const action = getThreefoldQuayInteraction(state, network, iriFate);
  if (!action) return null;
  if (action.kind === 'recover-governor' || action.kind === 'install-governor')
    return {
      network: {
        ...network,
        governorState:
          action.kind === 'recover-governor' ? 'carried' : 'installed',
      },
      outcome: null,
      milestoneId: '',
    };
  if (action.kind === 'rescue')
    return {
      network: { ...network, operatorReleased: true },
      outcome: 'rescued',
      milestoneId:
        network.governorState === 'installed'
          ? 'quay-rescue-with-governor'
          : 'quay-rescue-without-governor',
    };
  return { network, outcome: 'trapped', milestoneId: 'quay-regulator-found' };
}

/**
 * Explain the machine cost and current contextual action before commitment.
 * @param {ReturnType<typeof import('./simulation.js').createThreefoldSimulation>} state Active simulation.
 * @param {import('./pressure-network.js').ThreefoldPressureNetwork} network Shared machinery.
 * @param {import('./campaign-outcomes.js').ThreefoldIriFate|null} iriFate Known fate.
 * @returns {{title: string, text: string, hud: string, craneAvailable: boolean, action: QuayInteraction|null}|null} Accessible and handheld content.
 */
export function getThreefoldQuayContent(state, network, iriFate) {
  if (state.scene.id !== 'belltops') return null;
  const action = getThreefoldQuayInteraction(state, network, iriFate);
  const craneAvailable =
    network.governorState === 'crane' && !network.craneDestroyed;
  const machinery = network.craneDestroyed
    ? 'The harbor crane is destroyed.'
    : craneAvailable
      ? 'The harbor crane can still lift cargo.'
      : 'The harbor crane is intact but its lifting drive is unavailable.';
  const governor = {
    crane: 'The replacement governor is still in the crane.',
    carried: 'Mara carries the crane governor.',
    installed: 'The crane governor is fitted to the Quay regulator.',
    lost: 'The governor is lost with the destroyed machinery.',
  }[network.governorState];
  const rescued = iriFate?.outcome === 'rescued';
  const detail = action
    ? action.detail
    : rescued
      ? 'Iri has left the regulator. The machine cost and any feeder damage remain.'
      : 'Approach the panel or crane drive for an available operation.';
  return {
    title: 'Quay living regulator',
    text: `${machinery} ${governor} ${detail}`,
    hud: action
      ? action.hud
      : rescued
        ? network.governorState === 'installed'
          ? 'IRI SAFE · GOVERNOR HOLDS'
          : 'IRI SAFE · FEEDER UNREGULATED'
        : 'QUAY · APPROACH PANEL OR DRIVE',
    craneAvailable,
    action,
  };
}

/**
 * Read Iri's own permanent growth record without inferring any other fate.
 * @param {QuaySceneState} state Canonical region encounter.
 * @returns {boolean} Whether this region records Iri killed by growth.
 */
export function hasThreefoldQuayIriDeath(state) {
  return (state.encounter.growthDeaths || []).some(
    death => death.creatureId === THREEFOLD_BELLTOPS_IRI_ID
  );
}
