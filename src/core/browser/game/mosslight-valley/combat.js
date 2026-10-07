/** @typedef {{id: string, name: string, hp: number, power: number, weakness: string, intent: string[]}} CombatCreature */
/** @typedef {{creatureId: string, name: string, hp: number, maxHp: number, playerHp: number, turn: number, intent: string, status: string | null, guarding: boolean}} BattleState */
/** @typedef {Record<string, any> & {battle?: BattleState | null}} CombatState */
/** @typedef {{creatures: CombatCreature[]}} CombatContent */
/**
 * Start an authored encounter.
 * @param {CombatState} state Current game state.
 * @param {CombatCreature} creature Authored encounter creature.
 * @returns {CombatState} State with a new battle.
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
 * @param {CombatState} state Current game state.
 * @param {string} action Player battle action.
 * @param {CombatContent} content Authored encounter data.
 * @returns {CombatState} State after resolving the turn.
 */
export function battleAction(state, action, content) {
  const battle = state.battle;
  if (!battle) return state;
  const enemy = content.creatures.find(item => item.id === battle.creatureId);
  if (!enemy) return state;
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
      world: recordBattleVictory(state.world),
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

/**
 * Record a battle victory in world flags.
 * @param {Record<string, any>} world Current world state.
 * @returns {Record<string, any>} World with victory progress recorded.
 */
function recordBattleVictory(world) {
  return {
    ...world,
    flags: {
      ...world.flags,
      battleWon: true,
      memoryCount: (world.flags.memoryCount || 0) + 1,
    },
  };
}
