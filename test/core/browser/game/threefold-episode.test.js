import { normalizeThreefoldEpisodeState } from '../../../../src/core/browser/game/threefold/episode.js';

describe('THREEFOLD episode save state', () => {
  test.each([null, undefined, 'state'])(
    'rejects missing or primitive state %p',
    candidate => {
      expect(() => normalizeThreefoldEpisodeState(candidate)).toThrow(
        TypeError
      );
    }
  );

  test('migrates a saved episode without the Latchfolk outcome', () => {
    expect(
      normalizeThreefoldEpisodeState({
        passengers: 'aboard',
        ferry: 'afloat',
      })
    ).toEqual({
      passengers: 'aboard',
      ferry: 'afloat',
      latchfolk: 'unwarned',
    });
  });

  test('retains a valid Latchfolk outcome when normalizing', () => {
    expect(
      normalizeThreefoldEpisodeState({
        passengers: 'evacuated',
        ferry: 'lost',
        latchfolk: 'warned',
      })
    ).toEqual({
      passengers: 'evacuated',
      ferry: 'lost',
      latchfolk: 'warned',
    });
  });

  test('retains a valid withdrawal outcome when normalizing', () => {
    expect(
      normalizeThreefoldEpisodeState({
        passengers: 'lost',
        ferry: 'lost',
        latchfolk: 'lost',
        withdrawn: true,
      })
    ).toEqual({
      passengers: 'lost',
      ferry: 'lost',
      latchfolk: 'lost',
      withdrawn: true,
    });
  });

  test.each([null, 'unknown'])(
    'rejects invalid Latchfolk outcome %p',
    latchfolk => {
      expect(() =>
        normalizeThreefoldEpisodeState({
          passengers: 'aboard',
          ferry: 'afloat',
          latchfolk,
        })
      ).toThrow('Episode outcome state is invalid.');
    }
  );

  test.each([null, 'yes', 1])(
    'rejects invalid withdrawal outcome %p',
    withdrawn => {
      expect(() =>
        normalizeThreefoldEpisodeState({
          passengers: 'aboard',
          ferry: 'afloat',
          withdrawn,
        })
      ).toThrow('Episode outcome state is invalid.');
    }
  );
});
