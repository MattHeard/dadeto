import { normalizeThreefoldEpisodeState } from '../../../../src/core/browser/game/threefold/episode.js';

describe('THREEFOLD episode save state', () => {
  test('rejects a missing state before inspecting its fields', () => {
    expect(() => normalizeThreefoldEpisodeState(null)).toThrow(
      'Episode outcome state is required.'
    );
  });
});
