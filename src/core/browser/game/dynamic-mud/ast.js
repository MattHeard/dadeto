import { isPlainPrototypeObject } from '../../validation.js';

/** @typedef {{id: string, type: string, properties: Record<string, unknown>}} MudNode */
/** @typedef {{from: string, to: string, type: string}} MudRelation */
/** @typedef {{nodes: MudNode[], relations: MudRelation[]}} MudWorld */
/** @typedef {{kind: 'getNode', id: string} | {kind: 'findNodes', type?: string, property?: string, equals?: unknown} | {kind: 'createNode', id: string, type: string, properties?: Record<string, unknown>} | {kind: 'setProperty', id: string, property: string, value: unknown} | {kind: 'addRelation' | 'removeRelation', from: string, to: string, type: string} | {kind: 'deleteNode', id: string} | {kind: 'output' | 'broadcast', text: string}} MudOperation */
/** @typedef {{version: 1, operations: MudOperation[]}} MudProgram */

const MAX_OPERATIONS = 32;
const MAX_VALUE_DEPTH = 8;
const MAX_COLLECTION_SIZE = 256;
const IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,63}$/;
const RESERVED_KEYS = new Set(['__proto__', 'prototype', 'constructor']);
const OPERATION_KEYS = {
  getNode: ['kind', 'id'],
  findNodes: ['kind', 'type', 'property', 'equals'],
  createNode: ['kind', 'id', 'type', 'properties'],
  setProperty: ['kind', 'id', 'property', 'value'],
  addRelation: ['kind', 'from', 'to', 'type'],
  removeRelation: ['kind', 'from', 'to', 'type'],
  deleteNode: ['kind', 'id'],
  output: ['kind', 'text'],
  broadcast: ['kind', 'text'],
};

/**
 * @param {unknown} value - Candidate JSON-like value.
 * @param {number} [depth] - Current nesting depth.
 * @returns {boolean} Whether the value is bounded and safe.
 */
function isSafeValue(value, depth = 0) {
  if (depth > MAX_VALUE_DEPTH) return false;
  if (
    value === null ||
    ['string', 'number', 'boolean'].includes(typeof value)
  ) {
    return typeof value !== 'number' || Number.isFinite(value);
  }
  const isArray = Array.isArray(value);
  if (!isArray && !isPlainPrototypeObject(value)) return false;
  const entries = isArray
    ? value.map(entry => [null, entry])
    : Object.entries(value);
  if (entries.length > MAX_COLLECTION_SIZE) return false;
  for (const [key, entry] of entries) {
    if (
      (key !== null && RESERVED_KEYS.has(key)) ||
      !isSafeValue(entry, depth + 1)
    ) {
      return false;
    }
  }
  return true;
}

/**
 * @param {unknown} id - Candidate identifier.
 * @returns {id is string} Whether the identifier matches the safe grammar.
 */
function isIdentifier(id) {
  return typeof id === 'string' && IDENTIFIER.test(id);
}

/**
 * @param {unknown} operation - Candidate command node.
 * @returns {operation is MudOperation} Whether the command belongs to the supported AST.
 */
function isOperation(operation) {
  if (!isPlainPrototypeObject(operation) || typeof operation.kind !== 'string')
    return false;
  const allowedKeys =
    OPERATION_KEYS[/** @type {keyof typeof OPERATION_KEYS} */ (operation.kind)];
  if (
    !allowedKeys ||
    Object.keys(operation).some(key => !allowedKeys.includes(key))
  )
    return false;
  switch (operation.kind) {
    case 'getNode':
    case 'deleteNode':
      return isIdentifier(operation.id);
    case 'findNodes':
      return (
        (operation.type === undefined || isIdentifier(operation.type)) &&
        (operation.property === undefined ||
          isIdentifier(operation.property)) &&
        (operation.equals === undefined || isSafeValue(operation.equals))
      );
    case 'createNode':
      return (
        isIdentifier(operation.id) &&
        isIdentifier(operation.type) &&
        (operation.properties === undefined ||
          (isPlainPrototypeObject(operation.properties) &&
            isSafeValue(operation.properties)))
      );
    case 'setProperty':
      return (
        isIdentifier(operation.id) &&
        isIdentifier(operation.property) &&
        !RESERVED_KEYS.has(operation.property) &&
        isSafeValue(operation.value)
      );
    case 'addRelation':
    case 'removeRelation':
      return (
        isIdentifier(operation.from) &&
        isIdentifier(operation.to) &&
        isIdentifier(operation.type)
      );
    case 'output':
    case 'broadcast':
      return (
        typeof operation.text === 'string' && operation.text.length <= 2000
      );
    default:
      return false;
  }
}

/**
 * Validate the finite command language. Functions, code strings, and unknown fields are rejected.
 * @param {unknown} program - Candidate program.
 * @returns {{ok: true, program: MudProgram} | {ok: false, error: string}} Validation result.
 */
export function validateMudProgram(program) {
  if (
    !isPlainPrototypeObject(program) ||
    program.version !== 1 ||
    !Array.isArray(program.operations)
  ) {
    return {
      ok: false,
      error: 'Program must be a version 1 object with operations.',
    };
  }
  if (program.operations.length > MAX_OPERATIONS) {
    return {
      ok: false,
      error: `Program exceeds the ${MAX_OPERATIONS} operation limit.`,
    };
  }
  if (!program.operations.every(isOperation)) {
    return {
      ok: false,
      error: 'Program contains an invalid or unsupported operation.',
    };
  }
  return { ok: true, program: /** @type {MudProgram} */ (program) };
}

/**
 * @param {unknown} world - Candidate graph snapshot.
 * @returns {{ok: true, world: MudWorld} | {ok: false, error: string}} Validation result.
 */
export function validateMudWorld(world) {
  if (
    !isPlainPrototypeObject(world) ||
    !Array.isArray(world.nodes) ||
    !Array.isArray(world.relations) ||
    world.nodes.length > MAX_COLLECTION_SIZE ||
    world.relations.length > MAX_COLLECTION_SIZE
  ) {
    return {
      ok: false,
      error: 'World must contain bounded nodes and relations arrays.',
    };
  }
  const ids = new Set();
  for (const node of world.nodes) {
    if (
      !isPlainPrototypeObject(node) ||
      !isIdentifier(node.id) ||
      !isIdentifier(node.type) ||
      !isPlainPrototypeObject(node.properties) ||
      !isSafeValue(node.properties) ||
      ids.has(node.id)
    ) {
      return {
        ok: false,
        error: 'World contains an invalid or duplicate node.',
      };
    }
    ids.add(node.id);
  }
  for (const relation of world.relations) {
    if (
      !isPlainPrototypeObject(relation) ||
      !ids.has(relation.from) ||
      !ids.has(relation.to) ||
      !isIdentifier(relation.type)
    ) {
      return {
        ok: false,
        error: 'World contains an invalid or dangling relation.',
      };
    }
  }
  return { ok: true, world: /** @type {MudWorld} */ (world) };
}
