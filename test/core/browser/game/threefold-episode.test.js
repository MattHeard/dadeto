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

  test('accepts the additive partial passenger outcome', () => {
    expect(
      normalizeThreefoldEpisodeState({
        passengers: 'partial',
        ferry: 'afloat',
      })
    ).toEqual({
      passengers: 'partial',
      ferry: 'afloat',
      latchfolk: 'unwarned',
    });
  });

  test.each(['aboard', 'evacuated', 'lost'])(
    'retains a version 1 passenger outcome %s',
    passengers => {
      expect(
        normalizeThreefoldEpisodeState({
          passengers,
          ferry: passengers === 'aboard' ? 'afloat' : 'lost',
        }).passengers
      ).toBe(passengers);
    }
  );

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
      closedBy: 'departed',
    });
  });

  test('retains an explicit report closure when normalizing', () => {
    expect(
      normalizeThreefoldEpisodeState({
        passengers: 'evacuated',
        ferry: 'lost',
        latchfolk: 'safe',
        closedBy: 'reported',
      })
    ).toEqual({
      passengers: 'evacuated',
      ferry: 'lost',
      latchfolk: 'safe',
      closedBy: 'reported',
    });
  });

  test('retains a valid post-loss gate repair when normalizing', () => {
    expect(
      normalizeThreefoldEpisodeState({
        passengers: 'lost',
        ferry: 'lost',
        latchfolk: 'lost',
        gateRepaired: true,
      })
    ).toEqual({
      passengers: 'lost',
      ferry: 'lost',
      latchfolk: 'lost',
      gateRepaired: true,
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

  test.each([null, 'yes', 1])(
    'rejects invalid repaired-gate outcome %p',
    gateRepaired => {
      expect(() =>
        normalizeThreefoldEpisodeState({
          passengers: 'lost',
          ferry: 'lost',
          gateRepaired,
        })
      ).toThrow('Episode outcome state is invalid.');
    }
  );

  test.each([null, 'open', 'filed', 1])(
    'rejects invalid closure outcome %p',
    closedBy => {
      expect(() =>
        normalizeThreefoldEpisodeState({
          passengers: 'aboard',
          ferry: 'afloat',
          closedBy,
        })
      ).toThrow('Episode outcome state is invalid.');
    }
  );

  test.each([
    [true, 'reported'],
    [false, 'departed'],
  ])(
    'rejects inconsistent withdrawal/closure state %p %p',
    (withdrawn, closedBy) => {
      expect(() =>
        normalizeThreefoldEpisodeState({
          passengers: 'aboard',
          ferry: 'afloat',
          withdrawn,
          closedBy,
        })
      ).toThrow('Episode outcome state is invalid.');
    }
  );
});
