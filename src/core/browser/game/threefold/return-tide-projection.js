import {
  RETURN_TIDE_PEOPLE,
  RETURN_TIDE_DEVICES,
  getThreefoldReturnTideDamage,
} from './return-tide-world.js';

/**
 * Project permanent macro losses, deaths, displacement and the paid Foldglass cost.
 * @param {ReturnType<typeof import('./simulation.js').createThreefoldSimulation>} state Active physical region.
 * @param {import('./return-tide.js').ThreefoldReturnTide} tide Canonical irreversible tide state.
 * @returns {ReturnType<typeof import('./simulation.js').createThreefoldSimulation>} Updated region without resetting prior actions.
 */
export function projectThreefoldReturnTide(state, tide) {
  const people = RETURN_TIDE_PEOPLE.filter(
    person => person.sceneId === state.scene.id
  );
  const deaths = people
    .filter(person => tide.deathIds.includes(person.key))
    .map(person => person.id);
  const remembered = people
    .filter(person => tide.rememberedGrowthDeaths.includes(person.key))
    .map(person => ({
      creatureId: person.id,
      cause: /** @type {'growth'} */ ('growth'),
    }));
  const growth = new Map(
    (state.encounter.growthDeaths || []).map(death => [death.creatureId, death])
  );
  for (const death of remembered) growth.set(death.creatureId, death);
  const broken = RETURN_TIDE_DEVICES.filter(
    device =>
      device.sceneId === state.scene.id &&
      tide.brokenMechanisms.includes(device.kind)
  ).map(device => device.id);
  const rubble = [
    ...new Set([
      ...state.player.destroyedGeometryIds,
      ...getThreefoldReturnTideDamage(state.scene.id, tide.damageIds),
      ...broken,
    ]),
  ].sort();
  const departed = people
    .filter(person =>
      tide.displacedGroups.includes(person.faction || 'assembly')
    )
    .map(person => person.id);
  const creatures = state.scene.creatures.filter(
    creature => !deaths.includes(creature.id) && !departed.includes(creature.id)
  );
  const maximum =
    state.player.scale <= 3 && tide.controls.foldglassBound
      ? Math.min(state.player.maximumUnlockedScale, 3)
      : state.player.maximumUnlockedScale;
  return /** @type {ReturnType<typeof import('./simulation.js').createThreefoldSimulation>} */ ({
    ...state,
    player: {
      ...state.player,
      destroyedGeometryIds: rubble,
      maximumUnlockedScale: maximum,
    },
    encounter: {
      ...state.encounter,
      ...(growth.size
        ? {
            growthDeaths: [...growth.values()].sort((a, b) =>
              a.creatureId.localeCompare(b.creatureId)
            ),
          }
        : {}),
    },
    scene: {
      ...state.scene,
      creatures,
      interactables: state.scene.interactables,
    },
  });
}
