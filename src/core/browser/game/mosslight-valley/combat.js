// @ts-nocheck -- encounter state is owned by deterministic simulation.
/**
 * Start an authored encounter.
 * @param {unknown} state - The state argument.
 * @param {unknown} creature - The creature argument.
 * @returns {unknown} The computed result.
 */
export function startBattle(state, creature) {
  return {
    ...state,
    battle: {
      creatureId: creature.id,
      name: creature.name,
      hp: creature.hp,
      maxHp: creature.hp,
      playerHp: 18,
      turn: 0,
      intent: creature.intent[0],
      status: null,
      guarding: false,
    },
    mode: 'battle',
  };
}
/**
 * Resolve a player skill, enemy intent, status and reward in one turn.
 * @param {unknown} state - The state argument.
 * @param {unknown} action - The action argument.
 * @param {unknown} content - The content argument.
 * @returns {unknown} The computed result.
 */
export function battleAction(state, action, content) {
  const battle = state.battle;
  if (!battle) return state;
  if (action === 'herb' && !state.inventory.hearthTea)
    return { ...state, toast: 'No tea left.' };
  if (action === 'herb')
    state = {
      ...state,
      inventory: {
        ...state.inventory,
        hearthTea: state.inventory.hearthTea - 1,
      },
    };
  const enemy = content.creatures.find(item => item.id === battle.creatureId);
  let damage =
    action === 'sing' && enemy.weakness === 'song'
      ? 7
      : action === 'remember' && enemy.weakness === 'memory'
        ? 8
        : action === 'herb'
          ? 0
          : 4;
  if (action === 'guard') damage = 0;
  const hp = Math.max(0, battle.hp - damage);
  let playerHp =
    action === 'herb' ? Math.min(18, battle.playerHp + 8) : battle.playerHp;
  if (hp > 0 && action !== 'guard')
    playerHp = Math.max(1, playerHp - enemy.power);
  const turn = battle.turn + 1;
  if (hp === 0)
    return {
      ...state,
      battle: null,
      mode: 'world',
      inventory: {
        ...state.inventory,
        dreamFragment: (state.inventory.dreamFragment || 0) + 1,
      },
      world: {
        ...state.world,
        flags: {
          ...state.world.flags,
          battleWon: true,
          memoryCount: (state.world.flags.memoryCount || 0) + 1,
        },
      },
      toast: `${enemy.name} leaves a dream fragment.`,
    };
  return {
    ...state,
    battle: {
      ...battle,
      hp,
      playerHp,
      turn,
      intent: enemy.intent[turn % enemy.intent.length],
      status: action === 'sing' ? 'soothed' : battle.status,
      guarding: action === 'guard',
    },
    toast: `${enemy.name}: ${enemy.intent[turn % enemy.intent.length]}.`,
  };
}
