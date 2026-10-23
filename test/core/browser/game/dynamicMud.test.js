import { executeMudProgram } from '../../../../src/core/browser/game/dynamic-mud/dynamicMud.js';
import {
  validateMudProgram,
  validateMudWorld,
} from '../../../../src/core/browser/game/dynamic-mud/ast.js';

const world = {
  nodes: [
    {
      id: 'player',
      type: 'character',
      properties: { name: 'Ada', awake: true },
    },
    { id: 'door', type: 'door', properties: { open: false } },
  ],
  relations: [{ from: 'player', to: 'door', type: 'near' }],
};

describe('Dynamic MUD safe command DSL', () => {
  test('accepts the versioned bounded command grammar and rejects code or unknown fields', () => {
    expect(
      validateMudProgram({
        version: 1,
        operations: [{ kind: 'getNode', id: 'player' }],
      })
    ).toEqual({
      ok: true,
      program: { version: 1, operations: [{ kind: 'getNode', id: 'player' }] },
    });
    expect(
      validateMudProgram({
        version: 1,
        operations: [{ kind: 'getNode', id: 'player', code: 'run()' }],
      }).ok
    ).toBe(false);
    expect(
      validateMudProgram({
        version: 1,
        operations: [{ kind: 'findNodes', type: 'bad space' }],
      }).ok
    ).toBe(false);
    let kindReads = 0;
    const unknownAtSwitch = new Proxy(
      { kind: 'getNode', id: 'player' },
      {
        get(target, property, receiver) {
          if (property === 'kind' && kindReads++ > 1) return 'unknown';
          return Reflect.get(target, property, receiver);
        },
      }
    );
    expect(
      validateMudProgram({ version: 1, operations: [unknownAtSwitch] }).ok
    ).toBe(false);
    expect(
      validateMudProgram({ version: 1, operations: [Object.create(null)] }).ok
    ).toBe(false);
    expect(
      validateMudProgram({
        version: 1,
        operations: [{ kind: 'findNodes', property: '__proto__' }],
      }).ok
    ).toBe(false);
    expect(
      validateMudProgram({
        version: 1,
        operations: [{ kind: 'eval', source: '1+1' }],
      }).ok
    ).toBe(false);
    expect(validateMudProgram({ version: 2, operations: [] }).ok).toBe(false);
    expect(
      validateMudProgram({
        version: 1,
        operations: Array(33).fill({ kind: 'output', text: 'x' }),
      }).ok
    ).toBe(false);
    expect(
      validateMudProgram({
        version: 1,
        operations: [
          {
            kind: 'setProperty',
            id: 'player',
            property: 'constructor',
            value: 'x',
          },
        ],
      }).ok
    ).toBe(false);
  });

  test('rejects malformed worlds and dangling edges', () => {
    expect(validateMudWorld(world).ok).toBe(true);
    expect(
      validateMudWorld({
        nodes: [
          { id: 'x', type: 'thing', properties: {} },
          { id: 'x', type: 'thing', properties: {} },
        ],
        relations: [],
      }).ok
    ).toBe(false);
    expect(
      validateMudWorld({
        nodes: [{ id: 'x', type: 'thing', properties: {} }],
        relations: [{ from: 'x', to: 'missing', type: 'link' }],
      }).ok
    ).toBe(false);
    expect(
      validateMudWorld({
        nodes: [{ id: '__proto__', type: 'thing', properties: {} }],
        relations: [],
      }).ok
    ).toBe(false);
  });

  test('executes graph operations in order against an immutable world snapshot', () => {
    const result = executeMudProgram(world, {
      version: 1,
      operations: [
        { kind: 'getNode', id: 'player' },
        { kind: 'findNodes' },
        { kind: 'findNodes', type: 'door' },
        { kind: 'findNodes', property: 'open', equals: false },
        { kind: 'setProperty', id: 'door', property: 'open', value: true },
        {
          kind: 'createNode',
          id: 'key',
          type: 'item',
          properties: { uses: 1 },
        },
        { kind: 'createNode', id: 'note', type: 'item' },
        {
          kind: 'setProperty',
          id: 'player',
          property: 'inventory',
          value: ['key', { count: 1 }],
        },
        { kind: 'addRelation', from: 'player', to: 'key', type: 'carries' },
        { kind: 'removeRelation', from: 'player', to: 'door', type: 'near' },
        { kind: 'deleteNode', id: 'key' },
      ],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.results).toHaveLength(11);
    expect(
      result.world.nodes.find(node => node.id === 'door').properties.open
    ).toBe(true);
    expect(result.world.nodes.some(node => node.id === 'key')).toBe(false);
    expect(result.world.relations).toEqual([]);
    expect(world.nodes[1].properties.open).toBe(false);
    expect(world.relations).toHaveLength(1);
  });

  test('rolls back all changes when a later operation refers to a stale node', () => {
    const result = executeMudProgram(world, {
      version: 1,
      operations: [
        { kind: 'setProperty', id: 'door', property: 'open', value: true },
        { kind: 'deleteNode', id: 'missing' },
      ],
    });
    expect(result).toEqual({
      ok: false,
      world,
      error: "Node 'missing' does not exist.",
    });
  });

  test('returns output and broadcast as intents without executing external effects', () => {
    const result = executeMudProgram(world, {
      version: 1,
      operations: [
        { kind: 'output', text: 'The door creaks.' },
        { kind: 'broadcast', text: 'A bell rings.' },
      ],
    });
    expect(result).toEqual({
      ok: true,
      world,
      results: [null, null],
      emissions: [
        { kind: 'output', text: 'The door creaks.' },
        { kind: 'broadcast', text: 'A bell rings.' },
      ],
    });
  });

  test('returns validation errors without mutating or accepting invalid input', () => {
    expect(
      executeMudProgram(world, {
        version: 1,
        operations: [
          {
            kind: 'setProperty',
            id: 'door',
            property: 'x',
            value: { fn() {} },
          },
        ],
      })
    ).toEqual({
      ok: false,
      world,
      error: 'Program contains an invalid or unsupported operation.',
    });
    expect(
      executeMudProgram(
        { nodes: [], relations: 'bad' },
        { version: 1, operations: [] }
      )
    ).toEqual({
      ok: false,
      world: null,
      error: 'World must contain bounded nodes and relations arrays.',
    });
  });

  test('bounds nested JSON values and object property counts', () => {
    let deeplyNested = 'leaf';
    for (let index = 0; index < 9; index++) deeplyNested = [deeplyNested];
    const tooManyProperties = Object.fromEntries(
      Array.from({ length: 257 }, (_, index) => [`field${index}`, index])
    );
    expect(
      validateMudProgram({
        version: 1,
        operations: [
          {
            kind: 'setProperty',
            id: 'door',
            property: 'deep',
            value: deeplyNested,
          },
        ],
      }).ok
    ).toBe(false);
    expect(
      validateMudProgram({
        version: 1,
        operations: [
          {
            kind: 'createNode',
            id: 'large',
            type: 'thing',
            properties: tooManyProperties,
          },
        ],
      }).ok
    ).toBe(false);
  });

  test('fails closed if an operation changes after validation', () => {
    let reads = 0;
    const mutableOperation = new Proxy(
      { kind: 'getNode', id: 'player' },
      {
        get(target, property, receiver) {
          if (property === 'kind' && reads++ > 2) return 'unsupported';
          return Reflect.get(target, property, receiver);
        },
      }
    );
    const result = executeMudProgram(world, {
      version: 1,
      operations: [mutableOperation],
    });
    expect(result).toEqual({
      ok: false,
      world,
      error: 'Program contains an unsupported operation.',
    });
  });

  test('rejects duplicate nodes, stale property targets, and conflicting edges', () => {
    const duplicateNode = executeMudProgram(world, {
      version: 1,
      operations: [{ kind: 'createNode', id: 'player', type: 'character' }],
    });
    const missingPropertyTarget = executeMudProgram(world, {
      version: 1,
      operations: [
        { kind: 'setProperty', id: 'absent', property: 'open', value: true },
      ],
    });
    const missingRelationEndpoint = executeMudProgram(world, {
      version: 1,
      operations: [
        { kind: 'addRelation', from: 'player', to: 'absent', type: 'near' },
      ],
    });
    const duplicateRelation = executeMudProgram(world, {
      version: 1,
      operations: [
        { kind: 'addRelation', from: 'player', to: 'door', type: 'near' },
      ],
    });
    const missingNodeRead = executeMudProgram(world, {
      version: 1,
      operations: [{ kind: 'getNode', id: 'absent' }],
    });
    const missingRelation = executeMudProgram(world, {
      version: 1,
      operations: [
        { kind: 'removeRelation', from: 'player', to: 'absent', type: 'near' },
      ],
    });
    expect(duplicateNode.ok).toBe(false);
    expect(missingPropertyTarget.ok).toBe(false);
    expect(missingRelationEndpoint.ok).toBe(false);
    expect(duplicateRelation.ok).toBe(false);
    expect(missingNodeRead.ok).toBe(false);
    expect(missingRelation.ok).toBe(false);
  });
});
