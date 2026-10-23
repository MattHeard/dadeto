import { validateMudProgram, validateMudWorld } from './ast.js';

/**
 * @template T
 * @param {T} value - JSON-like value to copy.
 * @returns {T} A detached JSON-compatible copy.
 */
export function cloneMudValue(value) {
  return /** @type {T} */ (JSON.parse(JSON.stringify(value)));
}

/**
 * Execute one command against a private snapshot. No network, clock, storage, or arbitrary code is invoked.
 * Output and broadcast operations are returned as intents for a later adapter to handle.
 * @param {unknown} worldInput - Candidate graph snapshot.
 * @param {unknown} programInput - Candidate versioned command program.
 * @returns {{ok: true, world: import('./ast.js').MudWorld, results: unknown[], emissions: Array<{kind: 'output'|'broadcast', text: string}>} | {ok: false, world: import('./ast.js').MudWorld | null, error: string}} Atomic execution result.
 */
export function executeMudProgram(worldInput, programInput) {
  const validWorld = validateMudWorld(worldInput);
  if (!validWorld.ok)
    return { ok: false, world: null, error: validWorld.error };
  const validProgram = validateMudProgram(programInput);
  if (!validProgram.ok)
    return {
      ok: false,
      world: cloneMudValue(validWorld.world),
      error: validProgram.error,
    };

  const world = cloneMudValue(validWorld.world);
  /** @type {Array<{kind: 'output'|'broadcast', text: string}>} */
  const emissions = [];
  const results = [];
  for (const operation of validProgram.program.operations) {
    const result = applyOperation(world, operation, emissions);
    if (!result.ok) return fail(validWorld.world, result.error);
    results.push(result.value);
  }
  return { ok: true, world, results, emissions };
}

/**
 * @param {import('./ast.js').MudWorld} original - Unmodified input graph.
 * @param {string} error - Transaction rejection reason.
 * @returns {{ok: false, world: import('./ast.js').MudWorld, error: string}} Failed transaction.
 */
function fail(original, error) {
  return {
    ok: /** @type {false} */ (false),
    world: cloneMudValue(original),
    error,
  };
}

/**
 * @param {import('./ast.js').MudWorld} world - Private mutable transaction snapshot.
 * @param {import('./ast.js').MudOperation} operation - Validated command.
 * @param {Array<{kind: 'output'|'broadcast', text: string}>} emissions - Ordered deferred intents.
 * @returns {{ok: true, value: unknown} | {ok: false, error: string}} Operation result.
 */
function applyOperation(world, operation, emissions) {
  /**
   * @param {string} id - Node identifier to find.
   * @returns {import('./ast.js').MudNode | undefined} Matching node if present.
   */
  const findNode = id => world.nodes.find(node => node.id === id);
  switch (operation.kind) {
    case 'getNode': {
      const node = findNode(operation.id);
      return node
        ? { ok: true, value: cloneMudValue(node) }
        : { ok: false, error: `Node '${operation.id}' does not exist.` };
    }
    case 'findNodes':
      return {
        ok: true,
        value: cloneMudValue(
          world.nodes.filter(
            node =>
              (operation.type === undefined || node.type === operation.type) &&
              (operation.property === undefined ||
                node.properties[operation.property] === operation.equals)
          )
        ),
      };
    case 'createNode': {
      if (findNode(operation.id))
        return { ok: false, error: `Node '${operation.id}' already exists.` };
      const node = {
        id: operation.id,
        type: operation.type,
        properties: cloneMudValue(operation.properties || {}),
      };
      world.nodes.push(node);
      return { ok: true, value: cloneMudValue(node) };
    }
    case 'setProperty': {
      const node = findNode(operation.id);
      if (!node)
        return { ok: false, error: `Node '${operation.id}' does not exist.` };
      node.properties[operation.property] = cloneMudValue(operation.value);
      return { ok: true, value: cloneMudValue(node) };
    }
    case 'addRelation': {
      if (!findNode(operation.from) || !findNode(operation.to))
        return { ok: false, error: 'Relation endpoint does not exist.' };
      if (
        world.relations.some(relation => matchesRelation(relation, operation))
      ) {
        return { ok: false, error: 'Relation already exists.' };
      }
      const relation = {
        from: operation.from,
        to: operation.to,
        type: operation.type,
      };
      world.relations.push(relation);
      return { ok: true, value: cloneMudValue(relation) };
    }
    case 'removeRelation': {
      const index = world.relations.findIndex(relation =>
        matchesRelation(relation, operation)
      );
      return index < 0
        ? { ok: false, error: 'Relation does not exist.' }
        : { ok: true, value: world.relations.splice(index, 1)[0] };
    }
    case 'deleteNode': {
      const index = world.nodes.findIndex(node => node.id === operation.id);
      if (index < 0)
        return { ok: false, error: `Node '${operation.id}' does not exist.` };
      const deleted = world.nodes.splice(index, 1)[0];
      world.relations = world.relations.filter(
        relation =>
          relation.from !== operation.id && relation.to !== operation.id
      );
      return { ok: true, value: cloneMudValue(deleted) };
    }
    case 'output':
    case 'broadcast':
      emissions.push({ kind: operation.kind, text: operation.text });
      return { ok: true, value: null };
    default:
      return { ok: false, error: 'Program contains an unsupported operation.' };
  }
}

/**
 * @param {import('./ast.js').MudRelation} relation - Existing graph edge.
 * @param {Extract<import('./ast.js').MudOperation, {kind: 'addRelation'|'removeRelation'}>} operation - Edge command.
 * @returns {boolean} Whether the edge matches the command.
 */
function matchesRelation(relation, operation) {
  return (
    relation.from === operation.from &&
    relation.to === operation.to &&
    relation.type === operation.type
  );
}
