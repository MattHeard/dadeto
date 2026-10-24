import { isThreefoldInteractableInReach } from './scene-utils.js';
import { RETURN_TIDE_DEVICES } from './return-tide-world.js';
import {
  getThreefoldReturnTidePhase,
  operateThreefoldReturnTide,
  pledgeThreefoldReturnTide,
  observeThreefoldReturnTide,
} from './return-tide.js';

/** @typedef {{id:string,label:string,detail:string,operation?:import('./return-tide.js').ReturnTideOperation,faction?:import('./return-tide.js').ReturnTideFaction,survey?:boolean}} ReturnTideInteraction */

/**
 * Offer the nearest reachable physical device or earned local conversation.
 * @param {ReturnType<typeof import('./simulation.js').createThreefoldSimulation>} state Current physical region.
 * @param {import('./return-tide.js').ThreefoldReturnTide} tide Existing actual commitments.
 * @param {import('./return-tide.js').ReturnTideFacts} facts Prior established support.
 * @returns {ReturnTideInteraction|null} Contextual interaction without an ending selector.
 */
export function getThreefoldReturnTideInteraction(state, tide, facts) {
  if (
    getThreefoldReturnTidePhase(tide) === 'aftermath' &&
    !tide.observedSceneIds.includes(state.scene.id)
  )
    return {
      id: 'return-tide-survey',
      label: 'A SURVEY TIDE AFTERMATH',
      detail:
        'Survey this place and its surviving records. Other regions remain unknown until surveyed.',
      survey: true,
    };
  const choices = state.scene.interactables
    .filter(target => target.id.startsWith('return-tide-'))
    .filter(target => isThreefoldInteractableInReach(state, target.id))
    .map(target => ({
      target,
      interaction: describeInteraction(target.id, tide, facts),
    }))
    .filter(choice => choice.interaction)
    .sort(
      (a, b) =>
        Math.hypot(
          state.player.position.x - a.target.position.x,
          state.player.position.y - a.target.position.y
        ) -
        Math.hypot(
          state.player.position.x - b.target.position.x,
          state.player.position.y - b.target.position.y
        )
    );
  if (choices.length) return choices[0].interaction;
  return null;
}

/**
 * Apply exactly one deliberate physical operation or witnessed agreement.
 * @param {import('./return-tide.js').ThreefoldReturnTide} tide Current record.
 * @param {ReturnTideInteraction} interaction Visible pre-action affordance.
 * @param {{facts:import('./return-tide.js').ReturnTideFacts,sceneId:string}} context Canonical physical support and place.
 * @returns {{tide:import('./return-tide.js').ThreefoldReturnTide,notice:string}} Updated record and accessible feedback.
 */
export function applyThreefoldReturnTideInteraction(
  tide,
  interaction,
  context
) {
  let next = tide;
  if (interaction.operation)
    next = operateThreefoldReturnTide(
      tide,
      interaction.operation,
      context.facts
    );
  else if (interaction.faction)
    next = pledgeThreefoldReturnTide(tide, interaction.faction, context.facts);
  else if (interaction.survey)
    next = observeThreefoldReturnTide(tide, context.sceneId);
  return {
    tide: next,
    notice:
      next === tide
        ? `Cannot complete this operation yet. ${interaction.detail}`
        : interaction.detail,
  };
}

/**
 * Describe a device's concrete risk or a faction's explicit evacuation/service commitment.
 * @param {string} id Physical interaction ID.
 * @param {import('./return-tide.js').ThreefoldReturnTide} tide Installed hardware and signed promises.
 * @param {import('./return-tide.js').ReturnTideFacts} facts Available survivors and preparations.
 * @returns {ReturnTideInteraction|null} Available affordance or null while a local mission still owns E.
 */
function describeInteraction(id, tide, facts) {
  if (id.startsWith('return-tide-accord-')) {
    const faction =
      /** @type {import('./return-tide.js').ReturnTideFaction} */ (
        id.slice('return-tide-accord-'.length)
      );
    if (
      !facts.availableFactions.includes(faction) ||
      tide.agreements.includes(faction)
    )
      return null;
    return {
      id,
      faction,
      label: `E ${faction.toUpperCase()} ACCORD`,
      detail: `${faction} agrees to evacuate exposed households and staff daily manual-control shifts. Bring observed Quieting evidence; this does not erase prior losses or grant a free ending.`,
    };
  }
  if (id === 'return-tide-foldglass-control' && tide.controls.foldglassBound)
    return null;
  if (id === 'return-tide-foldglass-control')
    return {
      id,
      operation: 'bind-foldglass',
      label: 'A BIND FOLDGLASS',
      detail:
        'Requires all three intact manifolds, two observed evidence routes, engineering support and Assembly/Latchfolk/Choir/Crownback consent. Binding pays with ongoing duty and permanently prevents returning to scale +4 after leaving it; sacrifice-channel homes still flood.',
    };
  const device = RETURN_TIDE_DEVICES.find(
    candidate => `${candidate.id}-control` === id
  );
  if (!device) return null;
  if (
    tide.brokenMechanisms.includes(device.kind) ||
    !facts.intactMechanisms.includes(device.kind)
  )
    return null;
  if (
    device.kind === 'seal' &&
    tide.assemblySealPlanStatus === 'pending' &&
    facts.availableFactions.includes('assembly') &&
    !tide.controls.sealClosed
  )
    return {
      id,
      operation: 'interrupt-seal-plan',
      label: 'A INTERRUPT SEAL PLAN',
      detail:
        'The Assembly will close the Final Seal when the Return Tide rises. Interrupt it here before the deadline; you can still operate the spillway or manifolds instead. The Assembly plan commits at the 30-minute action-time mark.',
    };
  if (device.kind === 'seal')
    return {
      id,
      operation: tide.controls.sealClosed ? 'open-seal' : 'close-seal',
      label: tide.controls.sealClosed
        ? 'A OPEN CITY SEAL'
        : 'A CLOSE CITY SEAL',
      detail:
        'Closing protects the city but permanently severs deep Choir branches and harms the living breakwater. Reopening cannot restore dead branches. A separate spillway can bypass this seal.',
    };
  if (device.kind === 'spillway')
    return tide.controls.spillwayOpen
      ? null
      : {
          id,
          operation: 'open-spillway',
          label: 'A OPEN COAST SPILLWAY',
          detail:
            'Requires a surveyed Crownback route and guided Wakeform. Opening protects deep roots by flooding the Quay. Human evacuation changes survival; lost buildings remain lost.',
        };
  return manifoldInteraction(id, device.kind, tide);
}

/**
 * Show component installation until paid once, without duplicating parts.
 * @param {string} id Reachable device.
 * @param {string} kind Canonical manifold kind.
 * @param {import('./return-tide.js').ThreefoldReturnTide} tide Existing components.
 * @returns {ReturnTideInteraction|null} One uninstalled physical component.
 */
function manifoldInteraction(id, kind, tide) {
  const fields = {
    'human-manifold': 'humanManifold',
    'root-manifold': 'rootManifold',
    'coast-manifold': 'coastManifold',
  };
  const field = fields[/** @type {keyof typeof fields} */ (kind)];
  if (
    tide.controls[
      /** @type {keyof import('./return-tide.js').ReturnTideControls} */ (field)
    ]
  )
    return null;
  return {
    id,
    operation: /** @type {import('./return-tide.js').ReturnTideOperation} */ (
      `fit-${kind}`
    ),
    label: `A FIT ${kind.toUpperCase()}`,
    detail: `Fit the finite ${kind} component. It needs its local accord, surviving hardware and real engineering/relief/coastal preparation. Partial construction can still fail at the tide peak.`,
  };
}
