import { validateMudProgram, validateMudWorld } from './ast.js';
import { cloneMudValue, executeMudProgram } from './dynamicMud.js';

/** @typedef {import('./ast.js').MudWorld} MudWorld */
/** @typedef {import('./ast.js').MudProgram} MudProgram */

/**
 * Create a safe orchestration boundary for commands that are not registered.
 * Providers can suggest intent and build a finite program, but only validated
 * programs that match their predicted graph are registered and executed.
 * @param {{proposeCommand: (input: {command: string, world: MudWorld}) => Promise<{intent: string, predictedWorld: unknown}>, buildProgram: (input: {command: string, intent: string, world: MudWorld}) => Promise<unknown>, executeProgram?: typeof executeMudProgram, onStage?: (stage: 'proposing'|'building'|'validating'|'dry-run'|'registering'|'executing') => void}} deps Injected providers and execution boundary.
 * @returns {{has: (command: string) => boolean, run: (command: string, world: MudWorld) => Promise<{ok: true, world: MudWorld, emissions: Array<{kind: 'output'|'broadcast', text: string}>}|{ok: false, error: string}>, executeRegistered: (command: string, world: MudWorld) => ReturnType<typeof executeMudProgram>}} Command runtime.
 */
export function createDynamicMudUnknownCommandRuntime(deps) {
  /** @type {Map<string, MudProgram>} */
  const registry = new Map();
  const executeProgram = deps.executeProgram || executeMudProgram;

  /**
   * @param {string} command Candidate command.
   * @returns {boolean} Whether it has a verified program.
   */
  function has(command) {
    return registry.has(normalizeCommand(command));
  }

  /**
   * Prepare, compare, register, and execute one novel command.
   * @param {string} command Player command.
   * @param {MudWorld} world Current graph.
   * @returns {Promise<{ok: true, world: MudWorld, emissions: Array<{kind: 'output'|'broadcast', text: string}>}|{ok: false, error: string}>} Safe execution result.
   */
  async function run(command, world) {
    const key = normalizeCommand(command);
    if (!key) return reject('The command is empty.');
    if (registry.has(key)) return executeRegistered(key, world);

    const validatedWorld = validateMudWorld(world);
    if (!validatedWorld.ok) return reject(validatedWorld.error);
    const snapshot = cloneMudValue(validatedWorld.world);

    try {
      notifyStage(deps, 'proposing');
      const proposal = await deps.proposeCommand({
        command: key,
        world: cloneMudValue(snapshot),
      });
      if (
        !isRecord(proposal) ||
        typeof proposal.intent !== 'string' ||
        !proposal.intent.trim() ||
        proposal.intent.length > 2000
      ) {
        return reject('The proposed intent is invalid.');
      }
      const predictedWorld = validateMudWorld(proposal.predictedWorld);
      if (!predictedWorld.ok) return reject('The proposed state is invalid.');

      notifyStage(deps, 'building');
      const candidate = await deps.buildProgram({
        command: key,
        intent: proposal.intent.trim(),
        world: cloneMudValue(snapshot),
      });

      notifyStage(deps, 'validating');
      const validatedProgram = validateMudProgram(candidate);
      if (!validatedProgram.ok)
        return reject('The proposed command is not in the supported language.');

      notifyStage(deps, 'dry-run');
      const preview = executeMudProgram(snapshot, validatedProgram.program);
      if (!preview.ok) return reject(preview.error);
      if (!sameWorld(preview.world, predictedWorld.world))
        return reject('The proposed state did not match the safe preview.');
      if (!sameWorld(world, snapshot))
        return reject(
          'The world changed while the command was being prepared.'
        );

      notifyStage(deps, 'registering');
      registry.set(key, validatedProgram.program);
      notifyStage(deps, 'executing');
      const result = executeProgram(world, validatedProgram.program);
      if (!result.ok || !sameWorld(result.world, preview.world)) {
        registry.delete(key);
        return reject('The registered command could not be committed safely.');
      }
      return { ok: true, world: result.world, emissions: result.emissions };
    } catch {
      return reject('The proposed command could not be prepared safely.');
    }
  }

  /**
   * Execute a previously verified handler against the current world.
   * @param {string} command Registered command.
   * @param {MudWorld} world Current graph.
   * @returns {ReturnType<typeof executeMudProgram>} Execution result.
   */
  function executeRegistered(command, world) {
    const program = registry.get(normalizeCommand(command));
    return program
      ? executeProgram(world, program)
      : {
          ok: /** @type {false} */ (false),
          world: null,
          error: 'The command is not registered.',
        };
  }

  return { has, run, executeRegistered };
}

/**
 * Notify the UI about progress without allowing presentation failures to alter execution.
 * @param {Parameters<typeof createDynamicMudUnknownCommandRuntime>[0]} deps Runtime dependencies.
 * @param {'proposing'|'building'|'validating'|'dry-run'|'registering'|'executing'} stage Current stage.
 * @returns {void} Reports progress when the observer accepts it.
 */
function notifyStage(deps, stage) {
  try {
    deps.onStage?.(stage);
  } catch {
    // Presentation cannot interrupt a safe command transaction.
  }
}

/**
 * Normalize a command registry key.
 * @param {string} command Command text.
 * @returns {string} Canonical key.
 */
function normalizeCommand(command) {
  return typeof command === 'string' ? command.trim().toLowerCase() : '';
}

/**
 * Compare validated graph snapshots without depending on object key order.
 * @param {unknown} left First graph.
 * @param {unknown} right Second graph.
 * @returns {boolean} Whether graphs have identical JSON-safe values.
 */
function sameWorld(left, right) {
  return JSON.stringify(sortKeys(left)) === JSON.stringify(sortKeys(right));
}

/**
 * Recursively sort object keys while preserving array order.
 * @param {unknown} value JSON-safe value.
 * @returns {unknown} Canonical value.
 */
function sortKeys(value) {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (!isRecord(value)) return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map(key => [key, sortKeys(value[key])])
  );
}

/**
/**
 * Check for a plain object record.
 * @param {unknown} value Candidate object.
 * @returns {value is Record<string, any>} Whether value is a record.
 */
function isRecord(value) {
  return value?.constructor === Object;
}

/**
 * Return a rejected command result.
 * @param {string} error Explanation safe for the game transcript.
 * @returns {{ok: false, error: string}} Failure result.
 */
function reject(error) {
  return { ok: /** @type {false} */ (false), error };
}
