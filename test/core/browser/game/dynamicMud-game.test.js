import { createDynamicMudGame } from '../../../../src/core/browser/game/dynamic-mud/game.js';

describe('Dynamic MUD known-command game', () => {
  test('runs a known look command through the safe command interpreter', () => {
    const game = createDynamicMudGame();
    const result = game.run('look');

    expect(result.known).toBe(true);
    expect(result.state.transcript.at(-1)).toContain(
      'Rain whispers over a stone causeway'
    );
    expect(
      result.state.world.nodes.find(node => node.id === 'floodgate').properties
        .open
    ).toBe(false);
  });

  test('opens the gate only after the player rings the bell', () => {
    const game = createDynamicMudGame();
    game.run('open the floodgate');
    expect(
      game.getState().world.nodes.find(node => node.id === 'floodgate')
        .properties.open
    ).toBe(false);

    game.run('ring the bell');
    const opened = game.run('open the floodgate');
    expect(
      opened.state.world.nodes.find(node => node.id === 'floodgate').properties
        .open
    ).toBe(true);
    expect(opened.state.transcript.at(-1)).toContain('narrow crossing appears');
  });

  test('rejects unknown commands without changing the graph', () => {
    const game = createDynamicMudGame();
    const before = game.getState().world;
    const result = game.run('turn into a bird');

    expect(result.known).toBe(false);
    expect(result.state.world).toEqual(before);
    expect(result.state.transcript.at(-1)).toContain('do not know how');
  });

  test('returns detached snapshots to callers', () => {
    const game = createDynamicMudGame();
    const snapshot = game.getState();
    snapshot.world.nodes[0].properties.name = 'mutated';

    expect(game.getState().world.nodes[0].properties.name).toBe(
      'The Rain Causeway'
    );
  });

  test('rejects non-string input without changing the graph', () => {
    const game = createDynamicMudGame();
    const before = game.getState().world;
    const result = game.run(/** @type {any} */ (null));

    expect(result.known).toBe(false);
    expect(result.state.world).toEqual(before);
    expect(result.state.transcript.at(-1)).toContain('do that');
  });

  test('does not run an action when the starting graph lacks scene nodes', () => {
    const game = createDynamicMudGame({
      initialWorld: { nodes: [], relations: [] },
    });
    const result = game.run('look');

    expect(result.known).toBe(false);
    expect(result.state.world).toEqual({ nodes: [], relations: [] });
  });

  test('reports a rejected DSL transaction without replacing the world', () => {
    const game = createDynamicMudGame({
      executeProgram: () => ({
        ok: false,
        world: null,
        error: 'rejected safely',
      }),
    });
    const before = game.getState().world;
    const result = game.run('ring the bell');

    expect(result.known).toBe(true);
    expect(result.state.world).toEqual(before);
    expect(result.state.transcript.at(-1)).toContain('rejected safely');
  });

  test('describes the open gate and ringing bell on a later look', () => {
    const game = createDynamicMudGame();
    game.run('ring the bell');
    game.run('open the floodgate');

    expect(game.run('look').state.transcript.at(-1)).toContain(
      'The floodgate stands open. The bell still trembles softly.'
    );
  });
});
