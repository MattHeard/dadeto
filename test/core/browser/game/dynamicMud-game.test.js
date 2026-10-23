import { jest } from '@jest/globals';
import { createDynamicMudGame } from '../../../../src/core/browser/game/dynamic-mud/game.js';
import { executeMudProgram } from '../../../../src/core/browser/game/dynamic-mud/dynamicMud.js';

const OPEN_GATE_PROGRAM = {
  version: 1,
  operations: [
    { kind: 'setProperty', id: 'floodgate', property: 'open', value: true },
    { kind: 'output', text: 'A newly understood action opens the gate.' },
  ],
};

describe('Dynamic MUD known-command game', () => {
  test('runs a known look command through the safe command interpreter', async () => {
    const game = createDynamicMudGame();
    const result = await game.run('look');

    expect(result.known).toBe(true);
    expect(result.state.transcript.at(-1)).toContain(
      'Rain whispers over a stone causeway'
    );
    expect(
      result.state.world.nodes.find(node => node.id === 'floodgate').properties
        .open
    ).toBe(false);
  });

  test('opens the gate only after the player rings the bell', async () => {
    const game = createDynamicMudGame();
    await game.run('open the floodgate');
    expect(
      game.getState().world.nodes.find(node => node.id === 'floodgate')
        .properties.open
    ).toBe(false);

    await game.run('ring the bell');
    const opened = await game.run('open the floodgate');
    expect(
      opened.state.world.nodes.find(node => node.id === 'floodgate').properties
        .open
    ).toBe(true);
    expect(opened.state.transcript.at(-1)).toContain('narrow crossing appears');
  });

  test('rejects unknown commands without changing the graph', async () => {
    const game = createDynamicMudGame();
    const before = game.getState().world;
    const result = await game.run('turn into a bird');

    expect(result.known).toBe(false);
    expect(result.state.world).toEqual(before);
    expect(result.state.transcript.at(-1)).toContain('do not know how');
    expect(game.hasGeneratedCommand(/** @type {any} */ (null))).toBe(false);
  });

  test('returns detached snapshots to callers', async () => {
    const game = createDynamicMudGame();
    const snapshot = game.getState();
    snapshot.world.nodes[0].properties.name = 'mutated';

    expect(game.getState().world.nodes[0].properties.name).toBe(
      'The Rain Causeway'
    );
  });

  test('rejects non-string input without changing the graph', async () => {
    const game = createDynamicMudGame();
    const before = game.getState().world;
    const result = await game.run(/** @type {any} */ (null));

    expect(result.known).toBe(false);
    expect(result.state.world).toEqual(before);
    expect(result.state.transcript.at(-1)).toContain('do that');
  });

  test('does not run an action when the starting graph lacks scene nodes', async () => {
    const game = createDynamicMudGame({
      initialWorld: { nodes: [], relations: [] },
    });
    const result = await game.run('look');

    expect(result.known).toBe(false);
    expect(result.state.world).toEqual({ nodes: [], relations: [] });
  });

  test('reports a rejected DSL transaction without replacing the world', async () => {
    const game = createDynamicMudGame({
      executeProgram: () => ({
        ok: false,
        world: null,
        error: 'rejected safely',
      }),
    });
    const before = game.getState().world;
    const result = await game.run('ring the bell');

    expect(result.known).toBe(true);
    expect(result.state.world).toEqual(before);
    expect(result.state.transcript.at(-1)).toContain('rejected safely');
  });

  test('describes the open gate and ringing bell on a later look', async () => {
    const game = createDynamicMudGame();
    await game.run('ring the bell');
    await game.run('open the floodgate');

    expect((await game.run('look')).state.transcript.at(-1)).toContain(
      'The floodgate stands open. The bell still trembles softly.'
    );
  });

  test('known commands bypass providers and novel commands become registered', async () => {
    const proposeCommand = jest.fn(async ({ world }) => {
      const preview = executeMudProgram(world, OPEN_GATE_PROGRAM);
      return { intent: 'Open the floodgate.', predictedWorld: preview.world };
    });
    const buildProgram = jest.fn(async () => OPEN_GATE_PROGRAM);
    const game = createDynamicMudGame({ proposeCommand, buildProgram });

    await game.run('look');
    expect(proposeCommand).not.toHaveBeenCalled();

    const generated = await game.run('raise the floodgate');
    expect(generated.known).toBe(true);
    expect(
      generated.state.world.nodes.find(node => node.id === 'floodgate')
        .properties.open
    ).toBe(true);
    expect(game.hasGeneratedCommand('RAISE THE FLOODGATE')).toBe(true);
    expect(game.hasGeneratedCommand(/** @type {any} */ (null))).toBe(false);

    await game.run('raise the floodgate');
    expect(proposeCommand).toHaveBeenCalledTimes(1);
    expect(buildProgram).toHaveBeenCalledTimes(1);
  });

  test('records a rejected generated command without changing the world', async () => {
    const game = createDynamicMudGame({
      proposeCommand: async () => {
        throw new Error('provider unavailable');
      },
      buildProgram: async () => OPEN_GATE_PROGRAM,
    });
    const before = game.getState().world;

    const result = await game.run('open a secret hatch');

    expect(result.known).toBe(false);
    expect(result.state.world).toEqual(before);
    expect(result.state.transcript.at(-1)).toContain(
      'could not be prepared safely'
    );
    expect(game.hasGeneratedCommand('open a secret hatch')).toBe(false);
  });

  test('recovers the command queue after an action throws', async () => {
    const executeProgram = jest
      .fn()
      .mockImplementationOnce(() => {
        throw new Error('unexpected execution failure');
      })
      .mockImplementation((world, program) =>
        executeMudProgram(world, program)
      );
    const game = createDynamicMudGame({ executeProgram });

    await expect(game.run('look')).rejects.toThrow(
      'unexpected execution failure'
    );
    await expect(game.run('look')).resolves.toMatchObject({ known: true });
  });

  test('serializes a generated command before the next known action', async () => {
    let releaseProposal;
    const proposeCommand = jest.fn(
      ({ world }) =>
        new Promise(resolve => {
          releaseProposal = () => {
            const preview = executeMudProgram(world, OPEN_GATE_PROGRAM);
            resolve({
              intent: 'Open the floodgate.',
              predictedWorld: preview.world,
            });
          };
        })
    );
    const game = createDynamicMudGame({
      proposeCommand,
      buildProgram: async () => OPEN_GATE_PROGRAM,
    });
    const generated = game.run('raise the floodgate');
    const known = game.run('ring the bell');
    await Promise.resolve();
    await Promise.resolve();
    expect(releaseProposal).toEqual(expect.any(Function));
    releaseProposal();

    const [generatedResult, knownResult] = await Promise.all([
      generated,
      known,
    ]);
    expect(
      generatedResult.state.world.nodes.find(node => node.id === 'floodgate')
        .properties.open
    ).toBe(true);
    expect(
      knownResult.state.world.nodes.find(node => node.id === 'brass-bell')
        .properties.rung
    ).toBe(true);
    expect(proposeCommand).toHaveBeenCalledTimes(1);
  });
});
