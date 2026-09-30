// @ts-nocheck -- deterministic activities operate on serializable game state.
/**
 * Plant or water the active farm plot.
 * @param {unknown} state - The state argument.
 * @param {unknown} content - The content argument.
 * @returns {unknown} The computed result.
 */
export function farmAction(state, content) {
  const plot = state.farm;
  if (!plot.crop) {
    if (state.inventory.moonSeed) {
      return {
        ...state,
        inventory: {
          ...state.inventory,
          moonSeed: state.inventory.moonSeed - 1,
        },
        farm: {
          crop: 'moonTurnip',
          plantedDay: state.world.day,
          wateredDay: null,
        },
        toast: 'You plant a moon seed.',
      };
    }
    return { ...state, toast: 'The soil is waiting for a seed.' };
  }
  const crop = content.crops[plot.crop];
  if (
    state.world.day - plot.plantedDay >= crop.days &&
    crop.seasons.includes(state.world.season)
  )
    return {
      ...state,
      inventory: {
        ...state.inventory,
        [crop.item]: (state.inventory[crop.item] || 0) + 1,
      },
      farm: { crop: null, plantedDay: null, wateredDay: null },
      toast: 'A moon turnip glows in your hands.',
    };
  if (plot.wateredDay !== state.world.day)
    return {
      ...state,
      farm: { ...plot, wateredDay: state.world.day },
      toast: 'The soil drinks the rain you brought.',
    };
  return { ...state, toast: 'The seed is dreaming underground.' };
}
/**
 * Cast at the shore; catch chance is deterministic from world conditions.
 * @param {unknown} state - The state argument.
 * @param {unknown} content - The content argument.
 * @returns {unknown} The computed result.
 */
export function fishAction(state, content) {
  if (state.world.mapId !== 'shore')
    return { ...state, toast: 'The fishing line needs water.' };
  const found = Object.values(content.fish).find(
    fish =>
      fish.weather.includes(state.world.weather) &&
      state.world.time >= fish.hours[0] &&
      state.world.time < fish.hours[1]
  );
  if (!found) return { ...state, toast: 'Only your reflection bites.' };
  return {
    ...state,
    inventory: {
      ...state.inventory,
      [found.item]: (state.inventory[found.item] || 0) + 1,
    },
    toast: 'A lantern fish hums softly in the bucket.',
    world: { ...state.world, time: (state.world.time + 0.25) % 24 },
  };
}
/**
 * Advance crop growth and daily routines at dawn.
 * @param {unknown} state - The state argument.
 * @returns {unknown} The computed result.
 */
export function dawnActivities(state) {
  return {
    ...state,
    farm: { ...state.farm, wateredDay: null },
    world: { ...state.world, time: 7 },
  };
}
/**
 * Craft one story item when its ingredients are present.
 * @param {unknown} state - The state argument.
 * @param {unknown} recipe - The recipe argument.
 * @returns {unknown} The computed result.
 */
export function craftItem(state, recipe) {
  if (
    !recipe.ingredients.every(
      ([id, count]) => (state.inventory[id] || 0) >= count
    )
  )
    return { ...state, toast: 'You are missing something.' };
  const inventory = { ...state.inventory };
  for (const [id, count] of recipe.ingredients) inventory[id] -= count;
  inventory[recipe.output] = (inventory[recipe.output] || 0) + 1;
  return {
    ...state,
    inventory,
    toast: `Made ${recipe.output.replaceAll('_', ' ')}.`,
  };
}
