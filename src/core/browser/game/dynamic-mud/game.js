import { cloneMudValue, executeMudProgram } from './dynamicMud.js';
import { createDynamicMudUnknownCommandRuntime } from './unknownCommandRuntime.js';

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
 * @param {{initialWorld?: MudWorld, executeProgram?: typeof executeMudProgram, proposeCommand?: (input: {command: string, world: MudWorld}) => Promise<{intent: string, predictedWorld: unknown}>, buildProgram?: (input: {command: string, intent: string, world: MudWorld}) => Promise<unknown>, onGenerationStage?: (stage: 'proposing'|'building'|'validating'|'dry-run'|'registering'|'executing') => void}} [deps] Trusted game dependencies.
 * @returns {{getState: () => {world: MudWorld, transcript: string[]}, run: (input: string) => Promise<{known: boolean, state: {world: MudWorld, transcript: string[]}}>, hasGeneratedCommand: (input: string) => boolean}} Game controller.
 */
export function createDynamicMudGame(deps = {}) {
  const executeProgram = deps.executeProgram || executeMudProgram;
  const unknownCommands =
    deps.proposeCommand && deps.buildProgram
      ? createDynamicMudUnknownCommandRuntime({
          proposeCommand: deps.proposeCommand,
          buildProgram: deps.buildProgram,
          executeProgram,
          onStage: deps.onGenerationStage,
        })
      : null;
  let commandQueue = Promise.resolve();
  /** @type {{world: MudWorld, transcript: string[]}} */
  let state = {
    world: cloneMudValue(deps.initialWorld || STARTING_WORLD),
    transcript: [
      'You have reached the Rain Causeway. Try looking around or ringing the bell.',
    ],
  };

  /** @returns {{world: MudWorld, transcript: string[]}} Detached game state. */
  function getState() {
    return {
      world: cloneMudValue(state.world),
      transcript: [...state.transcript],
    };
  }

  /**
   * Queue one command so generated and known actions execute in order.
   * @param {string} input Player command.
   * @returns {Promise<{known: boolean, state: {world: MudWorld, transcript: string[]}}>} Command result.
   */
  function run(input) {
    const task = commandQueue.then(() => runCommand(input));
    commandQueue = task.then(
      () => undefined,
      () => undefined
    );
    return task;
  }

  /**
   * @param {string} input Player command.
   * @returns {Promise<{known: boolean, state: {world: MudWorld, transcript: string[]}}>} Command result.
   */
  async function runCommand(input) {
    const command = typeof input === 'string' ? input.trim().toLowerCase() : '';
    if (unknownCommands?.has(command)) {
      const registered = unknownCommands.executeRegistered(
        command,
        state.world
      );
      return applyExecution(registered, true);
    }

    const program = resolveKnownCommand(command, state.world);
    if (!program) {
      if (unknownCommands) {
        const generated = await unknownCommands.run(command, state.world);
        if (generated.ok) return applyExecution(generated, true);
        state = appendState(state, [generated.error]);
        return { known: false, state: getState() };
      }
      state = appendState(state, [
        `You do not know how to “${command || 'do that'}” yet. Try: look, ring the bell, open the floodgate.`,
      ]);
      return { known: false, state: getState() };
    }

    const result = executeProgram(state.world, program);
    return applyExecution(result, true);
  }

  /**
   * Apply one interpreter outcome to the controller state.
   * @param {{ok: true, world: MudWorld, emissions: Array<{kind: 'output'|'broadcast', text: string}>, results?: unknown[]}|{ok: false, world?: MudWorld|null, error: string}} result Execution outcome.
   * @param {boolean} known Whether input matched or registered as a command.
   * @returns {{known: boolean, state: {world: MudWorld, transcript: string[]}}} Updated state.
   */
  function applyExecution(result, known) {
    const lines = result.ok
      ? result.emissions.map(emission => emission.text)
      : [`The action failed: ${result.error}`];
    state = appendState(state, lines, result.ok ? result.world : undefined);
    return { known, state: getState() };
  }

  /**
   * Check whether a generated command has been verified and registered.
   * @param {string} input Player command.
   * @returns {boolean} Whether the normalized command is registered.
   */
  function hasGeneratedCommand(input) {
    return (
      unknownCommands?.has(
        typeof input === 'string' ? input.trim().toLowerCase() : ''
      ) || false
    );
  }

  return { getState, run, hasGeneratedCommand };
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
