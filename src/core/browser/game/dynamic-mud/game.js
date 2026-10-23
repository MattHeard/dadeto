import { executeMudProgram } from './dynamicMud.js';

/** @typedef {import('./ast.js').MudWorld} MudWorld */

const STARTING_WORLD = {
  nodes: [
    {
      id: 'causeway',
      type: 'room',
      properties: {
        name: 'The Rain Causeway',
        description:
          'Rain whispers over a stone causeway. A brass bell hangs beside the closed floodgate; a ferry lamp flickers across the water.',
      },
    },
    {
      id: 'brass-bell',
      type: 'object',
      properties: { name: 'brass bell', rung: false },
    },
    {
      id: 'floodgate',
      type: 'barrier',
      properties: { name: 'floodgate', open: false },
    },
  ],
  relations: [
    { from: 'causeway', to: 'brass-bell', type: 'contains' },
    { from: 'causeway', to: 'floodgate', type: 'contains' },
  ],
};

/**
 * Create a small known-command adventure backed by the safe DSL interpreter.
 * No provider or command generator is consulted.
 * @param {{initialWorld?: MudWorld, executeProgram?: typeof executeMudProgram}} [deps] Trusted game dependencies.
 * @returns {{getState: () => {world: MudWorld, transcript: string[]}, run: (input: string) => {known: boolean, state: {world: MudWorld, transcript: string[]}}}} Game controller.
 */
export function createDynamicMudGame(deps = {}) {
  const executeProgram = deps.executeProgram || executeMudProgram;
  /** @type {{world: MudWorld, transcript: string[]}} */
  let state = {
    world: copy(deps.initialWorld || STARTING_WORLD),
    transcript: [
      'You have reached the Rain Causeway. Try looking around or ringing the bell.',
    ],
  };

  /** @returns {{world: MudWorld, transcript: string[]}} Detached game state. */
  function getState() {
    return { world: copy(state.world), transcript: [...state.transcript] };
  }

  /**
   * Run one explicitly registered command. Unknown input cannot mutate the world.
   * @param {string} input Player command.
   * @returns {{known: boolean, state: {world: MudWorld, transcript: string[]}}} Command result.
   */
  function run(input) {
    const command = typeof input === 'string' ? input.trim().toLowerCase() : '';
    const program = resolveKnownCommand(command, state.world);
    if (!program) {
      state = appendState(state, [
        `You do not know how to “${command || 'do that'}” yet. Try: look, ring the bell, open the floodgate.`,
      ]);
      return { known: false, state: getState() };
    }

    const result = executeProgram(state.world, program);
    if (!result.ok) {
      state = appendState(state, [`The action failed: ${result.error}`]);
      return { known: true, state: getState() };
    }
    state = appendState(
      state,
      result.emissions.map(emission => emission.text),
      result.world
    );
    return { known: true, state: getState() };
  }

  return { getState, run };
}

/**
 * Resolve a known player command to a bounded DSL program.
 * @param {string} command Normalized player input.
 * @param {MudWorld} world Current graph snapshot.
 * @returns {import('./ast.js').MudProgram|null} Safe command program or null.
 */
function resolveKnownCommand(command, world) {
  if (command === 'look' || command === 'look around') {
    const room = world.nodes.find(node => node.id === 'causeway');
    const gate = world.nodes.find(node => node.id === 'floodgate');
    const bell = world.nodes.find(node => node.id === 'brass-bell');
    if (!room || !gate || !bell) return null;
    const gateState = gate.properties.open
      ? 'The floodgate stands open.'
      : 'The floodgate is closed.';
    const bellState = bell.properties.rung
      ? 'The bell still trembles softly.'
      : 'The brass bell waits in the rain.';
    return outputProgram(
      `${room.properties.description} ${gateState} ${bellState}`
    );
  }
  if (command === 'ring the bell' || command === 'ring bell') {
    return setPropertyAndOutput(
      'brass-bell',
      'rung',
      true,
      'The bell rings out over the water. A moment later, the ferry lamp answers with a slow blink.'
    );
  }
  if (command === 'open the floodgate' || command === 'open floodgate') {
    const bell = world.nodes.find(node => node.id === 'brass-bell');
    if (!bell?.properties.rung) {
      return outputProgram(
        'The latch is stiff. A thin wire runs from it toward the brass bell.'
      );
    }
    return setPropertyAndOutput(
      'floodgate',
      'open',
      true,
      'The ferry answers the bell. The floodgate lifts, and a narrow crossing appears.'
    );
  }
  return null;
}

/**
 * Create one bounded output-only DSL program.
 * @param {string} text Narrative output.
 * @returns {import('./ast.js').MudProgram} DSL program.
 */
function outputProgram(text) {
  return { version: 1, operations: [{ kind: 'output', text }] };
}

/**
 * Create a state update followed by its narrative response.
 * @param {string} id Node to update.
 * @param {string} property Property to set.
 * @param {boolean} value New property value.
 * @param {string} text Narrative output.
 * @returns {import('./ast.js').MudProgram} DSL program.
 */
function setPropertyAndOutput(id, property, value, text) {
  return {
    version: 1,
    operations: [
      { kind: 'setProperty', id, property, value },
      { kind: 'output', text },
    ],
  };
}

/**
 * Append narrative output and optionally commit an interpreter-produced world.
 * @param {{world: MudWorld, transcript: string[]}} state Current state.
 * @param {string[]} lines New transcript lines.
 * @param {MudWorld} [world] Committed world, if a command succeeded.
 * @returns {{world: MudWorld, transcript: string[]}} Updated state.
 */
function appendState(state, lines, world = state.world) {
  return { world, transcript: [...state.transcript, ...lines] };
}

/**
 * Copy a JSON-safe graph snapshot.
 * @template T
 * @param {T} value Input data.
 * @returns {T} Detached data.
 */
function copy(value) {
  return /** @type {T} */ (JSON.parse(JSON.stringify(value)));
}
