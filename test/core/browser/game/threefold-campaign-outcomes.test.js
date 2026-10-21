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
    const alive = recordThreefoldIriFate(createThreefoldCampaignOutcomes(), {
      outcome: 'alive',
      milestoneId: 'regulator-encounter',
      elapsedGameSeconds: 30,
    });
    expect(alive.iriFate).toEqual({
      outcome: 'alive',
      milestoneId: 'regulator-encounter',
      elapsedGameSeconds: 30,
    });

    const escaped = recordThreefoldIriFate(alive, {
      outcome: 'escaped',
      milestoneId: 'regulator-evacuation',
      elapsedGameSeconds: 45,
    });
    expect(escaped.iriFate.outcome).toBe('escaped');
    expect(
      recordThreefoldIriFate(escaped, {
        outcome: 'alive',
        milestoneId: 'stale-alive-milestone',
        elapsedGameSeconds: 60,
      })
    ).toEqual(escaped);

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
    const outcomes = {
      iriFate: {
        outcome: 'escaped',
        milestoneId: 'regulator-evacuation',
        elapsedGameSeconds: 540,
      },
    };
    const serialized = serializeThreefoldCampaignOutcomes(outcomes);
    expect(restoreThreefoldCampaignOutcomes(serialized)).toEqual(outcomes);
    expect(
      restoreThreefoldCampaignOutcomes(
        serializeThreefoldCampaignOutcomes(createThreefoldCampaignOutcomes())
      )
    ).toEqual({ iriFate: null });
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
          schemaVersion: 2,
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
        outcome: 'alive',
        milestoneId: 1,
        elapsedGameSeconds: 30,
      })
    ).toThrow('Campaign Iri fate is invalid.');
    expect(() =>
      createThreefoldCampaignOutcomes({
        outcome: 'alive',
        milestoneId: 'Regulator Encounter',
        elapsedGameSeconds: 30,
      })
    ).toThrow('Campaign Iri fate is invalid.');
    expect(() =>
      createThreefoldCampaignOutcomes({
        outcome: 'alive',
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

    expect(brokenGate.recordIriFate('alive', 'regulator-encounter')).toBe(true);
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
    expect(otherRoute.recordIriFate('alive', 'stale-regulator-report')).toBe(
      false
    );
    expect(otherRoute.frame().threefold.campaignIriFate).toEqual(fate);
  });
});
