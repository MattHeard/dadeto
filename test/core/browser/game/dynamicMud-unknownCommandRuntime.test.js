import { jest } from '@jest/globals';
import { executeMudProgram } from '../../../../src/core/browser/game/dynamic-mud/dynamicMud.js';
import { createDynamicMudUnknownCommandRuntime } from '../../../../src/core/browser/game/dynamic-mud/unknownCommandRuntime.js';

const PROGRAM = {
  version: 1,
  operations: [
    { kind: 'setProperty', id: 'gate', property: 'open', value: true },
    { kind: 'output', text: 'The gate opens.' },
  ],
};

/** @returns {{nodes: Array<{id: string, type: string, properties: Record<string, unknown>}>, relations: Array<{from: string, to: string, type: string}>}} Valid graph for command tests. */
function createWorld() {
  return {
    nodes: [
      {
        id: 'gate',
        type: 'barrier',
        properties: { name: 'floodgate', open: false },
      },
    ],
    relations: [],
  };
}

/**
 * @param {object} overrides Provider overrides.
 * @returns {ReturnType<typeof createDynamicMudUnknownCommandRuntime>} Configured runtime.
 */
function createRuntime(overrides = {}) {
  const world = createWorld();
  const preview = executeMudProgram(world, PROGRAM);
  if (!preview.ok) throw new Error('Test program should be valid.');
  return createDynamicMudUnknownCommandRuntime({
    proposeCommand: async () => ({
      intent: 'Raise the floodgate.',
      predictedWorld: preview.world,
    }),
    buildProgram: async () => PROGRAM,
    ...overrides,
  });
}

describe('Dynamic MUD unknown-command safety pipeline', () => {
  test('rejects empty commands and invalid world graphs', async () => {
    const runtime = createRuntime();

    expect((await runtime.run('   ', createWorld())).error).toContain('empty');
    expect(
      (await runtime.run(/** @type {any} */ (null), createWorld())).error
    ).toContain('empty');
    expect(
      (await runtime.run('raise', /** @type {any} */ (null))).error
    ).toContain('World');
    expect(runtime.has('raise')).toBe(false);
  });

  test('rejects a valid program that cannot execute on the current graph', async () => {
    const runtime = createRuntime({
      buildProgram: async () => ({
        version: 1,
        operations: [
          { kind: 'setProperty', id: 'missing', property: 'open', value: true },
        ],
      }),
    });

    const result = await runtime.run('open the hidden gate', createWorld());

    expect(result.ok).toBe(false);
    expect(result.error).toContain('does not exist');
    expect(runtime.has('open the hidden gate')).toBe(false);
  });

  test('proposes, builds, validates, dry-runs, compares, registers, and executes', async () => {
    const stages = [];
    const proposeCommand = jest.fn(async () => {
      const preview = executeMudProgram(createWorld(), PROGRAM);
      return { intent: 'Raise the floodgate.', predictedWorld: preview.world };
    });
    const buildProgram = jest.fn(async () => PROGRAM);
    const runtime = createRuntime({
      proposeCommand,
      buildProgram,
      onStage: stage => stages.push(stage),
    });
    const world = createWorld();

    const result = await runtime.run('raise the gate', world);

    expect(result.ok).toBe(true);
    expect(result.world.nodes[0].properties.open).toBe(true);
    expect(result.emissions).toEqual([
      { kind: 'output', text: 'The gate opens.' },
    ]);
    expect(runtime.has('RAISE THE GATE')).toBe(true);
    expect(proposeCommand).toHaveBeenCalledWith({
      command: 'raise the gate',
      world,
    });
    expect(buildProgram).toHaveBeenCalledWith({
      command: 'raise the gate',
      intent: 'Raise the floodgate.',
      world,
    });
    expect(stages).toEqual([
      'proposing',
      'building',
      'validating',
      'dry-run',
      'registering',
      'executing',
    ]);
    await expect(
      runtime.run('raise the gate', result.world).then(result => result.ok)
    ).resolves.toBe(true);
    expect(proposeCommand).toHaveBeenCalledTimes(1);
  });

  test('rejects unsupported DSL without mutating or registering the command', async () => {
    const runtime = createRuntime({
      buildProgram: async () => ({
        version: 1,
        operations: [{ kind: 'eval', source: 'world.nodes=[]' }],
      }),
    });
    const world = createWorld();
    const before = JSON.stringify(world);

    const result = await runtime.run('raise the gate', world);

    expect(result.ok).toBe(false);
    expect(result.error).toContain('supported language');
    expect(JSON.stringify(world)).toBe(before);
    expect(runtime.has('raise the gate')).toBe(false);
  });

  test('rejects a predicted world that does not match the isolated dry-run', async () => {
    const runtime = createRuntime({
      proposeCommand: async () => ({
        intent: 'Raise the floodgate.',
        predictedWorld: createWorld(),
      }),
    });
    const world = createWorld();

    const result = await runtime.run('raise the gate', world);

    expect(result.ok).toBe(false);
    expect(result.error).toContain('did not match');
    expect(world.nodes[0].properties.open).toBe(false);
    expect(runtime.has('raise the gate')).toBe(false);
  });

  test('rejects invalid proposal worlds and empty intents', async () => {
    const invalidWorld = createRuntime({
      proposeCommand: async () => ({
        intent: 'Raise the gate.',
        predictedWorld: null,
      }),
    });
    const noIntent = createRuntime({
      proposeCommand: async () => ({
        intent: '  ',
        predictedWorld: createWorld(),
      }),
    });

    expect((await invalidWorld.run('raise', createWorld())).ok).toBe(false);
    expect((await noIntent.run('raise', createWorld())).ok).toBe(false);
    expect(invalidWorld.has('raise')).toBe(false);
    expect(noIntent.has('raise')).toBe(false);
  });

  test('rejects when the graph changes while the providers are working', async () => {
    /** @type {(result: {intent: string, predictedWorld: unknown}) => void} */
    let releaseProposal;
    const runtime = createRuntime({
      proposeCommand: () =>
        new Promise(resolve => {
          releaseProposal = resolve;
        }),
    });
    const world = createWorld();
    const pending = runtime.run('raise the gate', world);
    await Promise.resolve();
    world.nodes[0].properties.open = true;
    const preview = executeMudProgram(createWorld(), PROGRAM);
    releaseProposal({
      intent: 'Raise the floodgate.',
      predictedWorld: preview.world,
    });

    const result = await pending;

    expect(result.ok).toBe(false);
    expect(result.error).toContain('world changed');
    expect(runtime.has('raise the gate')).toBe(false);
  });

  test('rolls registry state back if final execution fails', async () => {
    const runtime = createRuntime({
      executeProgram: () => ({
        ok: false,
        world: null,
        error: 'commit failed',
      }),
    });

    const result = await runtime.run('raise the gate', createWorld());

    expect(result.ok).toBe(false);
    expect(result.error).toContain('committed safely');
    expect(runtime.has('raise the gate')).toBe(false);
  });

  test('returns a defined stale-entity error for a registered program', async () => {
    const runtime = createRuntime();
    const created = await runtime.run('raise the gate', createWorld());
    expect(created.ok).toBe(true);

    const stale = runtime.executeRegistered('raise the gate', {
      nodes: [],
      relations: [],
    });

    expect(stale.ok).toBe(false);
    expect(stale.error).toContain('does not exist');
  });

  test('reports an unknown registry entry without executing it', () => {
    const executeProgram = jest.fn();
    const runtime = createRuntime({ executeProgram });

    const result = runtime.executeRegistered('unregistered', createWorld());

    expect(result.ok).toBe(false);
    expect(result.error).toContain('not registered');
    expect(executeProgram).not.toHaveBeenCalled();
  });

  test('provider failures do not mutate or register commands', async () => {
    const runtime = createRuntime({
      proposeCommand: async () => {
        throw new Error('sensitive provider detail');
      },
    });
    const world = createWorld();
    const before = JSON.stringify(world);

    const result = await runtime.run('raise the gate', world);

    expect(result.ok).toBe(false);
    expect(result.error).toBe(
      'The proposed command could not be prepared safely.'
    );
    expect(result.error).not.toContain('sensitive');
    expect(JSON.stringify(world)).toBe(before);
    expect(runtime.has('raise the gate')).toBe(false);
  });
});
