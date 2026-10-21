import {
  createThreefoldCampaignOutcomes,
  recordThreefoldIriFate,
  restoreThreefoldCampaignOutcomes,
  serializeThreefoldCampaignOutcomes,
} from '../../../../src/core/browser/game/threefold/campaign-outcomes.js';
import { createThreefoldCampaignOutcomesSaveStore } from '../../../../src/core/browser/game/threefold/save.js';
import { createThreefoldRuntime } from '../../../../src/core/browser/game/threefold/runtime.js';
import { createThreefoldSiltMarginScene } from '../../../../src/core/browser/game/threefold/silt-margin.js';

describe('THREEFOLD campaign outcomes', () => {
  test('starts without publishing an undiscovered Iri outcome', () => {
    expect(createThreefoldCampaignOutcomes()).toEqual({ iriFate: null });
    expect(createThreefoldCampaignOutcomes(null)).toEqual({ iriFate: null });
    expect(
      recordThreefoldIriFate(createThreefoldCampaignOutcomes(), null)
    ).toEqual({ iriFate: null });
  });

  test('records authored outcomes at campaign milestones and prevents backtracking', () => {
    const trapped = recordThreefoldIriFate(createThreefoldCampaignOutcomes(), {
      outcome: 'trapped',
      milestoneId: 'regulator-encounter',
      elapsedGameSeconds: 30,
    });
    expect(trapped.iriFate).toEqual({
      outcome: 'trapped',
      milestoneId: 'regulator-encounter',
      elapsedGameSeconds: 30,
    });

    const abandoned = recordThreefoldIriFate(trapped, {
      outcome: 'abandoned',
      milestoneId: 'regulator-left-unattended',
      elapsedGameSeconds: 40,
    });
    const rescued = recordThreefoldIriFate(abandoned, {
      outcome: 'rescued',
      milestoneId: 'regulator-rescue',
      elapsedGameSeconds: 50,
    });
    expect(rescued.iriFate.outcome).toBe('rescued');
    expect(
      recordThreefoldIriFate(rescued, {
        outcome: 'abandoned',
        milestoneId: 'rescue-reversal',
        elapsedGameSeconds: 60,
      })
    ).toEqual(rescued);

    const escaped = recordThreefoldIriFate(trapped, {
      outcome: 'escaped',
      milestoneId: 'regulator-escape',
      elapsedGameSeconds: 45,
    });
    expect(escaped.iriFate.outcome).toBe('escaped');
    expect(
      recordThreefoldIriFate(escaped, {
        outcome: 'trapped',
        milestoneId: 'late-regulator-arrival',
        elapsedGameSeconds: 60,
      })
    ).toEqual(escaped);
    expect(
      recordThreefoldIriFate(escaped, {
        outcome: 'abandoned',
        milestoneId: 'late-abandonment',
        elapsedGameSeconds: 60,
      })
    ).toEqual(escaped);
    expect(
      recordThreefoldIriFate(escaped, {
        outcome: 'rescued',
        milestoneId: 'late-rescue',
        elapsedGameSeconds: 60,
      })
    ).toEqual(escaped);

    const evacuated = recordThreefoldIriFate(trapped, {
      outcome: 'evacuated',
      milestoneId: 'crew-evacuation',
      elapsedGameSeconds: 45,
    });
    expect(
      recordThreefoldIriFate(evacuated, {
        outcome: 'trapped',
        milestoneId: 'late-regulator-arrival',
        elapsedGameSeconds: 60,
      })
    ).toEqual(evacuated);

    const dead = recordThreefoldIriFate(escaped, {
      outcome: 'dead',
      milestoneId: 'later-fatality',
      elapsedGameSeconds: 60,
    });
    expect(dead.iriFate.outcome).toBe('dead');
    expect(
      recordThreefoldIriFate(dead, {
        outcome: 'escaped',
        milestoneId: 'stale-escape-milestone',
        elapsedGameSeconds: 75,
      })
    ).toEqual(dead);
    expect(
      recordThreefoldIriFate(dead, {
        outcome: 'dead',
        milestoneId: 'backdated-fatality',
        elapsedGameSeconds: 30,
      })
    ).toEqual(dead);
    expect(
      recordThreefoldIriFate(dead, {
        outcome: 'dead',
        milestoneId: 'later-fatality-note',
        elapsedGameSeconds: 75,
      }).iriFate.milestoneId
    ).toBe('later-fatality-note');
  });

  test('roundtrips a campaign-specific versioned envelope', () => {
    for (const outcome of [
      'trapped',
      'rescued',
      'escaped',
      'dead',
      'evacuated',
      'abandoned',
    ]) {
      const outcomes = {
        iriFate: {
          outcome,
          milestoneId: 'regulator-encounter',
          elapsedGameSeconds: 540,
        },
      };
      const serialized = serializeThreefoldCampaignOutcomes(outcomes);
      expect(JSON.parse(serialized).schemaVersion).toBe(2);
      expect(restoreThreefoldCampaignOutcomes(serialized)).toEqual(outcomes);
    }
    expect(
      restoreThreefoldCampaignOutcomes(
        serializeThreefoldCampaignOutcomes(createThreefoldCampaignOutcomes())
      )
    ).toEqual({ iriFate: null });
  });

  test('migrates version-one living status without losing campaign evidence', () => {
    const legacyEnvelope = outcome =>
      JSON.stringify({
        game: 'threefold-campaign-outcomes',
        schemaVersion: 1,
        state: {
          iriFate: {
            outcome,
            milestoneId: 'regulator-encounter',
            elapsedGameSeconds: 30,
          },
        },
      });
    expect(restoreThreefoldCampaignOutcomes(legacyEnvelope('alive'))).toEqual({
      iriFate: {
        outcome: 'trapped',
        milestoneId: 'regulator-encounter',
        elapsedGameSeconds: 30,
      },
    });
    expect(
      restoreThreefoldCampaignOutcomes(legacyEnvelope('escaped')).iriFate
        .outcome
    ).toBe('escaped');
    expect(restoreThreefoldCampaignOutcomes(legacyEnvelope('trapped'))).toBe(
      null
    );
  });

  test('rejects unrelated, unsupported, and malformed campaign outcome saves', () => {
    expect(restoreThreefoldCampaignOutcomes(null)).toBeNull();
    expect(restoreThreefoldCampaignOutcomes('{bad json')).toBeNull();
    expect(
      restoreThreefoldCampaignOutcomes(JSON.stringify({ game: 'other' }))
    ).toBeNull();
    expect(
      restoreThreefoldCampaignOutcomes(
        JSON.stringify({
          game: 'threefold-campaign-outcomes',
          schemaVersion: 3,
          state: { iriFate: null },
        })
      )
    ).toBeNull();
    expect(
      restoreThreefoldCampaignOutcomes(
        JSON.stringify({
          game: 'threefold-campaign-outcomes',
          schemaVersion: 1,
        })
      )
    ).toBeNull();
    expect(
      restoreThreefoldCampaignOutcomes(
        JSON.stringify({
          game: 'threefold-campaign-outcomes',
          schemaVersion: 2,
          state: {
            iriFate: {
              outcome: 'unknown',
              milestoneId: 'regulator-encounter',
              elapsedGameSeconds: 30,
            },
          },
        })
      )
    ).toBeNull();
    expect(() =>
      createThreefoldCampaignOutcomes({
        outcome: 'unknown',
        milestoneId: 'regulator-encounter',
        elapsedGameSeconds: 30,
      })
    ).toThrow('Campaign Iri fate is invalid.');
    expect(() => createThreefoldCampaignOutcomes(false)).toThrow(
      'Campaign Iri fate is invalid.'
    );
    expect(() =>
      createThreefoldCampaignOutcomes({
        outcome: 1,
        milestoneId: 'regulator-encounter',
        elapsedGameSeconds: 30,
      })
    ).toThrow('Campaign Iri fate is invalid.');
    expect(() =>
      createThreefoldCampaignOutcomes({
        outcome: 'trapped',
        milestoneId: 1,
        elapsedGameSeconds: 30,
      })
    ).toThrow('Campaign Iri fate is invalid.');
    expect(() =>
      createThreefoldCampaignOutcomes({
        outcome: 'trapped',
        milestoneId: 'Regulator Encounter',
        elapsedGameSeconds: 30,
      })
    ).toThrow('Campaign Iri fate is invalid.');
    expect(() =>
      createThreefoldCampaignOutcomes({
        outcome: 'trapped',
        milestoneId: 'regulator-encounter',
        elapsedGameSeconds: -1,
      })
    ).toThrow(RangeError);
    expect(
      restoreThreefoldCampaignOutcomes(
        JSON.stringify({
          game: 'threefold-campaign-outcomes',
          schemaVersion: 1,
          state: {
            iriFate: {
              outcome: 'unknown',
              milestoneId: 'regulator-encounter',
              elapsedGameSeconds: 30,
            },
          },
        })
      )
    ).toBeNull();
  });

  test('stores outcomes through the injected campaign storage boundary', () => {
    const values = new Map();
    const storage = {
      getItem: key => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
      removeItem: key => values.delete(key),
    };
    const store = createThreefoldCampaignOutcomesSaveStore(storage);
    expect(store.load()).toBeNull();
    const outcomes = {
      iriFate: {
        outcome: 'dead',
        milestoneId: 'regulator-failure',
        elapsedGameSeconds: 75,
      },
    };
    expect(store.save(outcomes)).toBe(true);
    expect(store.load()).toEqual(outcomes);
    expect(store.clear()).toBe(true);
    expect(store.load()).toBeNull();
  });

  test('keeps discovered Iri fate in campaign state across route resets', () => {
    const values = new Map();
    const storage = {
      getItem: key => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
      removeItem: key => values.delete(key),
    };
    const brokenGate = createThreefoldRuntime({ storage });
    expect(brokenGate.getSnapshot().campaign.iriFate).toBeNull();
    expect(brokenGate.frame().threefold.campaignIriFate).toBeNull();

    expect(brokenGate.recordIriFate('trapped', 'regulator-encounter')).toBe(
      true
    );
    brokenGate.dispatch('right');
    expect(brokenGate.recordIriFate('escaped', 'regulator-evacuation')).toBe(
      true
    );

    const reloaded = createThreefoldRuntime({ storage });
    const fate = {
      outcome: 'escaped',
      milestoneId: 'regulator-evacuation',
      elapsedGameSeconds: 15,
    };
    expect(reloaded.getSnapshot().campaign.iriFate).toEqual(fate);
    expect(reloaded.frame().threefold.campaignIriFate).toEqual(fate);
    reloaded.resetSave();

    const otherRoute = createThreefoldRuntime({
      scene: createThreefoldSiltMarginScene(),
      storage,
    });
    expect(otherRoute.getSnapshot().campaign.iriFate).toEqual(fate);
    expect(otherRoute.recordIriFate('trapped', 'stale-regulator-report')).toBe(
      false
    );
    expect(otherRoute.frame().threefold.campaignIriFate).toEqual(fate);
  });
});
