import { previewThreefoldGrowthEffects } from './simulation.js';
import { isGatehouseRatInReach } from './encounter.js';
import { isThreefoldInteractableInReach } from './scene-utils.js';

const DIRECTIONS = ['up', 'down', 'left', 'right'];
const WAIT_MINUTES = 15;

/**
 * Resolve handheld edges without advancing held single-press controls twice.
 * @param {ReturnType<typeof import('./simulation.js').createThreefoldSimulation>} state Pre-input region.
 * @param {Set<string>} pressed Currently held keys.
 * @param {Set<string>} previousActions Previously held keys.
 * @returns {{type:string,direction?:string,elapsedGameMinutes?:number}|null} One command, save request, or no new input.
 */
export function getThreefoldHandheldInput(state, pressed, previousActions) {
  const direction = DIRECTIONS.find(action => pressed.has(action));
  if (direction) return { type: 'move', direction };
  else if (pressed.has('a') && !previousActions.has('a')) {
    const nearbyInteraction = state.scene.interactables.some(({ id }) =>
      isThreefoldInteractableInReach(state, id)
    );
    if (nearbyInteraction) return { type: 'interact' };
    const growsThroughRat =
      previewThreefoldGrowthEffects(state).creatureIds.includes(
        'gatehouse-rat'
      );
    return {
      type: growsThroughRat
        ? 'grow'
        : isGatehouseRatInReach(state)
          ? 'fight'
          : 'grow',
    };
  } else if (pressed.has('b') && !previousActions.has('b'))
    return { type: 'shrink' };
  else if (pressed.has('x') && !previousActions.has('x'))
    return isGatehouseRatInReach(state)
      ? { type: 'bypass' }
      : { type: 'wait', elapsedGameMinutes: WAIT_MINUTES };
  else if (pressed.has('y') && !previousActions.has('y'))
    return { type: 'save' };
  return null;
}
