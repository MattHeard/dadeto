import { createThreefoldSluiceScene } from '../../../../src/core/browser/game/threefold/sluice-scene.js';
import {
  createThreefoldSiltMarginScene,
  normalizeThreefoldSiltMarginState,
} from '../../../../src/core/browser/game/threefold/silt-margin.js';
import {
  createThreefoldWeftwaysScene,
  normalizeThreefoldWeftwaysState,
} from '../../../../src/core/browser/game/threefold/weftways.js';
import { advanceThreefoldIriArrival } from '../../../../src/core/browser/game/threefold/iri-arrival.js';
import * as outcomes from '../../../../src/core/browser/game/threefold/campaign-outcomes.js';
import { createThreefoldPressureNetwork } from '../../../../src/core/browser/game/threefold/pressure-network.js';
import { createThreefoldRuntime } from '../../../../src/core/browser/game/threefold/runtime.js';
import { createThreefoldBelltopsScene } from '../../../../src/core/browser/game/threefold/belltops.js';
import {
  createThreefoldSimulation,
  stepThreefoldSimulation,
} from '../../../../src/core/browser/game/threefold/simulation.js';
import {
  createThreefoldPressureNetworkSaveStore,
  createThreefoldSimulationSaveStore,
  createThreefoldCampaignClockSaveStore,
  createThreefoldCampaignOutcomesSaveStore,
} from '../../../../src/core/browser/game/threefold/save.js';

/** @returns {any} Fresh canonical campaign timeline. */
function campaign() {
  return {
    clock: { elapsedGameSeconds: 0 },
    outcomes: outcomes.createThreefoldCampaignOutcomes(),
    network: createThreefoldPressureNetwork(),
  };
}
/**
 * @param {any} [episode] Prior passenger/repair facts.
 * @returns {any} Saved gate facts.
 */
function gateFacts(episode = {}) {
  return {
    episode,
    player: { destroyedGeometryIds: [] },
    crisis: { stage: 'rising' },
  };
}
/** @returns {any} Shared in-memory browser storage. */
function storageAdapter() {
  const values = new Map();
  return {
    values,
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: key => values.delete(key),
  };
}

describe('THREEFOLD tide-driven Iri arrival', () => {
  test.each(
    [
      ['no support', {}, {}, 'abandoned', 'quay-support-withdrawal'],
      [
        'first rescued ferry group',
        { 'broken-gate': gateFacts({ passengers: 'partial' }) },
        {},
        'evacuated',
        'quay-engineer-crane-evacuation',
      ],
      [
        'both rescued groups',
        { 'broken-gate': gateFacts({ passengers: 'evacuated' }) },
        {},
        'evacuated',
        'quay-engineer-crane-evacuation',
      ],
      [
        'timely repaired ferry',
        {
          'broken-gate': gateFacts({
            gateRepairedBeforeSurge: true,
            ferry: 'afloat',
          }),
        },
        {},
        'evacuated',
        'quay-engineer-crane-evacuation',
      ],
      [
        'lost engineer',
        { 'broken-gate': gateFacts({ passengers: 'lost' }) },
        {},
        'abandoned',
        'quay-support-withdrawal',
      ],
      [
        'disabled crane',
        { 'broken-gate': gateFacts({ passengers: 'partial' }) },
        { governorState: 'carried' },
        'abandoned',
        'quay-support-withdrawal',
      ],
      [
        'destroyed crane',
        { 'broken-gate': gateFacts({ passengers: 'partial' }) },
        { craneDestroyed: true, governorState: 'lost' },
        'abandoned',
        'quay-support-withdrawal',
      ],
      [
        'fitted replacement',
        {},
        { governorState: 'installed' },
        'escaped',
        'quay-fitted-governor-escape',
      ],
      [
        'coordinated relief',
        {},
        { bypassOpen: true },
        'escaped',
        'quay-relief-escape',
      ],
    ].map(row => ({
      name: row[0],
      runs: row[1],
      network: row[2],
      result: { outcome: row[3], milestoneId: row[4] },
    }))
  )(
    '$name yields the physical arrival at surge without revealing it',
    scenario => {
      const { runs, network, result } = scenario;
      const before = campaign();
      before.network = { ...before.network, ...network };
      const next = advanceThreefoldIriArrival(before, runs, 540);
      expect(next.outcomes.iriFate).toEqual({
        ...result,
        elapsedGameSeconds: 540,
      });
      expect(outcomes.getKnownThreefoldIriFate(next.outcomes)).toBeNull();
      expect(next.remainingSeconds).toBe(0);
      if (result.outcome === 'evacuated')
        expect(next.network).toMatchObject({
          operatorReleased: true,
          governorState: 'installed',
        });
    }
  );

  test('uses exact explicit milestone boundaries and does not backfill missing legacy events', () => {
    const before = campaign();
    expect(
      advanceThreefoldIriArrival(before, {}, 539).outcomes.iriFate
    ).toBeNull();
    before.clock.elapsedGameSeconds = 539;
    const crossed = advanceThreefoldIriArrival(before, {}, 1);
    expect(crossed.outcomes.iriFate.elapsedGameSeconds).toBe(540);
    expect(
      advanceThreefoldIriArrival(
        { ...before, clock: { elapsedGameSeconds: 901 } },
        {},
        0
      ).outcomes.iriFate
    ).toBeNull();
    expect(() => advanceThreefoldIriArrival(before, {}, -1)).toThrow();
  });

  test('an unchecked forced gate kills a still-present Iri at aftermath and preserves known history', () => {
    const before = campaign();
    before.outcomes = outcomes.createThreefoldCampaignOutcomes({
      outcome: 'trapped',
      milestoneId: 'quay-regulator-found',
      elapsedGameSeconds: 15,
    });
    const runs = { 'broken-gate': gateFacts() };
    runs['broken-gate'].player.destroyedGeometryIds = ['relief-gate'];
    const next = advanceThreefoldIriArrival(before, runs, 915);
    expect(next.outcomes.iriFate).toEqual({
      outcome: 'dead',
      milestoneId: 'quay-unchecked-gate-surge',
      elapsedGameSeconds: 900,
    });
    expect(outcomes.getKnownThreefoldIriFate(next.outcomes)).toEqual(
      before.outcomes.iriFate
    );
    expect(next.network.regulatorFailed).toBe(true);
    expect(next.remainingSeconds).toBe(15);
    const observed = outcomes.observeThreefoldIriFate(next.outcomes);
    expect(observed.iriFate).toEqual(next.outcomes.iriFate);
    expect(outcomes.getKnownThreefoldIriFate(observed).outcome).toBe('dead');
  });

  test('later relief can free abandoned Iri at aftermath, without backdating the escape', () => {
    const abandoned = advanceThreefoldIriArrival(campaign(), {}, 540);
    const next = advanceThreefoldIriArrival(
      { ...abandoned, network: { ...abandoned.network, bypassOpen: true } },
      {},
      375
    );
    expect(next.outcomes.iriFate).toMatchObject({
      outcome: 'escaped',
      elapsedGameSeconds: 900,
    });
    expect(
      next.network.volumesCubicMeters.reduce((a, b) => a + b, 0)
    ).toBeCloseTo(0.005, 12);
  });

  test.each(['rescued', 'escaped', 'evacuated', 'dead'])(
    'never recomputes an existing %s fate',
    outcome => {
      const before = campaign();
      before.outcomes = outcomes.createThreefoldCampaignOutcomes({
        outcome,
        milestoneId: 'prior-event',
        elapsedGameSeconds: 15,
      });
      const next = advanceThreefoldIriArrival(before, {}, 915);
      expect(next.outcomes).toEqual(before.outcomes);
    }
  );

  test('does not invent a fate for retained departure or legacy growth-death evidence', () => {
    const before = campaign();
    before.network.operatorReleased = true;
    expect(
      advanceThreefoldIriArrival(before, {}, 915).outcomes.iriFate
    ).toBeNull();
    before.network.operatorReleased = false;
    const runs = {
      belltops: {
        encounter: {
          growthDeaths: [{ creatureId: 'belltops-iri', cause: 'growth' }],
        },
        player: { destroyedGeometryIds: [] },
        scene: { id: 'belltops' },
      },
    };
    expect(
      advanceThreefoldIriArrival(before, runs, 915).outcomes.iriFate
    ).toBeNull();
  });

  test('keeps abandoned Iri alive when there is no forced-gate surge', () => {
    const next = advanceThreefoldIriArrival(campaign(), {}, 915);
    expect(next.outcomes.iriFate).toMatchObject({
      outcome: 'abandoned',
      elapsedGameSeconds: 540,
    });
    expect(next.network.regulatorFailed).toBe(false);
  });

  test('rejects backdated machinery changes and contradictory knowledge', () => {
    const before = campaign();
    before.network.bypassOpen = true;
    before.outcomes = outcomes.createThreefoldCampaignOutcomes({
      outcome: 'abandoned',
      milestoneId: 'future-import',
      elapsedGameSeconds: 1000,
    });
    expect(
      advanceThreefoldIriArrival(before, {}, 540).network.operatorReleased
    ).toBe(false);
    expect(() =>
      outcomes.createThreefoldCampaignOutcomes(null, before.outcomes.iriFate)
    ).toThrow('knowledge conflicts');
    expect(() =>
      outcomes.createThreefoldCampaignOutcomes(
        { outcome: 'trapped', milestoneId: 'current', elapsedGameSeconds: 10 },
        before.outcomes.iriFate
      )
    ).toThrow('knowledge conflicts');
  });
});

describe('THREEFOLD playable arrival discovery', () => {
  test('persists a hidden death across backup and reveals its original cause only at the panel', () => {
    const storage = storageAdapter();
    const gate = createStormDeath(storage);
    expect(gate.getSnapshot().campaign.iriFate).toBeNull();
    expect(gate.frame().threefold.campaignIriFate).toBeNull();
    const backup = gate.exportCampaign();
    const saved = createThreefoldCampaignOutcomesSaveStore(storage).load();
    expect(saved.iriFate.outcome).toBe('dead');
    const destination = storageAdapter();
    const imported = createThreefoldRuntime({ storage: destination });
    imported.importCampaign(backup);
    expect(imported.getSnapshot().campaign.iriFate).toBeNull();
    const quay = createThreefoldRuntime({
      storage: destination,
      scene: createThreefoldBelltopsScene(),
    });
    expect(
      quay
        .getState()
        .scene.creatures.some(creature => creature.id === 'belltops-iri')
    ).toBe(false);
    expect(quay.frame().threefold.quayRegulator.hud).toContain(
      'READ QUAY SHIFT RECORD'
    );
    quay.dispatch('interact');
    expect(quay.getSnapshot().campaign.iriFate).toEqual(saved.iriFate);
    expect(quay.frame().threefold.quayRegulator.text).toContain(
      'forced, unrepaired Broken Gate'
    );
    quay.resetSave();
    expect(quay.getSnapshot().campaign.iriFate).toEqual(saved.iriFate);
  });

  test('reads abandonment before allowing a deliberate subsequent rescue, including press edges', () => {
    const storage = storageAdapter();
    const gate = createThreefoldRuntime({ storage });
    gate.dispatch({ type: 'wait', elapsedGameMinutes: 9 });
    const quay = createThreefoldRuntime({
      storage,
      scene: createThreefoldBelltopsScene(),
    });
    quay.start();
    quay.step(500, ['interact']);
    expect(quay.getSnapshot().campaign.iriFate.outcome).toBe('abandoned');
    expect(quay.getSnapshot().campaign.network.operatorReleased).toBe(false);
    quay.step(125, []);
    quay.step(125, ['interact']);
    expect(quay.getSnapshot().campaign.iriFate.outcome).toBe('rescued');
  });

  test('pause, redraw and resume do not advance or discover any outcome', () => {
    const storage = storageAdapter();
    const gate = createThreefoldRuntime({ storage });
    gate.dispatch({ type: 'wait', elapsedGameMinutes: 9 });
    const before = gate.exportCampaign();
    gate.pause();
    gate.step(500, ['interact']);
    gate.frame();
    gate.getSnapshot();
    gate.resume();
    expect(gate.exportCampaign()).toBe(before);
    expect(gate.getSnapshot().campaign.iriFate).toBeNull();
  });

  test('an action finishing at the surge cannot retroactively supply an engineer', () => {
    const storage = storageAdapter();
    const base = createThreefoldSimulation({
      urgentAtMinutes: 4,
      surgeAtMinutes: 9,
      aftermathAtMinutes: 15,
    });
    // The gate mooring is reachable at the authored spawn only after moving;
    // seed a canonical prior position and time, then use the real interaction.
    const scene = base.scene;
    const mooring = scene.interactables.find(
      target => target.id === 'ferry-mooring-line'
    );
    expect(mooring).toBeDefined();
    const positioned = {
      ...base,
      player: { ...base.player, position: { ...mooring.position } },
    };
    createThreefoldSimulationSaveStore(storage).save(positioned);
    createThreefoldCampaignClockSaveStore(storage).save({
      elapsedGameSeconds: 525,
    });
    const runtime = createThreefoldRuntime({ storage });
    runtime.dispatch('interact');
    expect(runtime.getState().episode.passengers).toBe('partial');
    expect(
      createThreefoldCampaignOutcomesSaveStore(storage).load().iriFate.outcome
    ).toBe('abandoned');
  });
});

test('a late physical repair prevents the aftermath death without undoing the earlier abandonment', () => {
  const gate = gateFacts({ gateRepaired: true });
  gate.player.destroyedGeometryIds = ['relief-gate'];
  const result = advanceThreefoldIriArrival(
    campaign(),
    { 'broken-gate': gate },
    915
  );
  expect(result.outcomes.iriFate).toMatchObject({
    outcome: 'abandoned',
    elapsedGameSeconds: 540,
  });
  expect(result.network.regulatorFailed).toBe(false);
});

/**
 * Establish the real forced-gate death through canonical state and runtime actions.
 * @param {any} storage Shared campaign storage.
 * @returns {any} Active gate runtime after the aftermath.
 */
function createStormDeath(storage) {
  const gate = createThreefoldRuntime({ storage });
  const state = gate.getState();
  createThreefoldSimulationSaveStore(storage).save({
    ...state,
    player: { ...state.player, position: { x: 4.2, y: 4 } },
  });
  gate.dispatch('grow');
  expect(gate.getState().player.destroyedGeometryIds).toContain('relief-gate');
  gate.dispatch({ type: 'wait', elapsedGameMinutes: 15 });
  expect(
    createThreefoldCampaignOutcomesSaveStore(storage).load().iriFate.outcome
  ).toBe('dead');
  return gate;
}

/**
 * Prepare already-earned local evidence prerequisites without requiring Iri's account.
 * @param {string} kind Authored independent route.
 * @returns {any} Canonical scene state and its next reachable evidence interaction.
 */
function prepareEvidence(kind) {
  const thresholds = {
    urgentAtMinutes: 4,
    surgeAtMinutes: 9,
    aftermathAtMinutes: 15,
  };
  if (kind === 'archive') {
    let state = createThreefoldSimulation(
      thresholds,
      createThreefoldSluiceScene()
    );
    state = stepThreefoldSimulation(state, { type: 'interact' });
    state = stepThreefoldSimulation(state, {
      type: 'wait',
      elapsedGameMinutes: 15,
    });
    return {
      state: {
        ...state,
        player: { ...state.player, scale: -1, position: { x: 5.55, y: 2.1 } },
      },
      field: 'archiveTraceHeard',
      content: 'archiveQuietingTrace',
    };
  }
  if (kind === 'silt') {
    const state = createThreefoldSimulation(
      thresholds,
      createThreefoldSiltMarginScene()
    );
    const target = state.scene.interactables.find(
      item => item.id === 'silt-margin-choir-signal'
    );
    return {
      state: {
        ...state,
        player: { ...state.player, position: { ...target.position } },
        siltMargin: normalizeThreefoldSiltMarginState({
          guardian: 'guided-aside',
          signal: 'sent',
        }),
      },
      field: 'siltMargin',
      content: 'siltMarginQuietingEvidence',
    };
  }
  const state = createThreefoldSimulation(
    thresholds,
    createThreefoldWeftwaysScene()
  );
  const target = state.scene.interactables.find(
    item => item.id === 'weftways-pell'
  );
  return {
    state: {
      ...state,
      player: { ...state.player, position: { ...target.position } },
      weftways: normalizeThreefoldWeftwaysState({ flowChoice: 'pell-bypass' }),
    },
    field: 'weftways',
    content: 'threadboundRelayRecord',
  };
}

test.each(['archive', 'silt', 'weft'])(
  'the %s evidence can still be discovered after the actual offscreen death',
  kind => {
    const storage = storageAdapter();
    createStormDeath(storage);
    const { state, field, content } = prepareEvidence(kind);
    expect(
      createThreefoldSimulationSaveStore(storage, state.scene.id).save(state)
    ).toBe(true);
    const runtime = createThreefoldRuntime({ storage, scene: state.scene });
    runtime.dispatch('interact');
    expect(runtime.frame().threefold[content]).toBeTruthy();
    if (field === 'archiveTraceHeard')
      expect(runtime.getState()[field]).toBe(true);
    if (field === 'siltMargin')
      expect(runtime.getState()[field].quietingEvidenceHeard).toBe(true);
    if (field === 'weftways')
      expect(runtime.getState()[field].relayRecordRead).toBe(true);
    expect(runtime.getSnapshot().campaign.iriFate).toBeNull();
    expect(runtime.frame().threefold).not.toHaveProperty(
      'iriRecordedConfession'
    );
  }
);

test.each(['engineer', 'governor'])(
  'a real %s departure removes Iri and presents the stored cause after inspection',
  kind => {
    const storage = storageAdapter();
    const gate = createThreefoldRuntime({ storage });
    if (kind === 'engineer') {
      const state = gate.getState();
      createThreefoldSimulationSaveStore(storage).save({
        ...state,
        episode: { ...state.episode, passengers: 'partial' },
      });
    } else
      createThreefoldPressureNetworkSaveStore(storage).save({
        ...createThreefoldPressureNetwork(),
        governorState: 'installed',
      });
    gate.dispatch({ type: 'wait', elapsedGameMinutes: 9 });
    const quay = createThreefoldRuntime({
      storage,
      scene: createThreefoldBelltopsScene(),
    });
    expect(
      quay.getState().scene.creatures.some(item => item.id === 'belltops-iri')
    ).toBe(false);
    expect(quay.getSnapshot().campaign.iriFate).toBeNull();
    quay.dispatch('interact');
    expect(quay.getSnapshot().campaign.iriFate).toMatchObject({
      outcome: kind === 'engineer' ? 'evacuated' : 'escaped',
      elapsedGameSeconds: 540,
    });
    expect(quay.frame().threefold.quayRegulator.text).toContain(
      kind === 'engineer' ? 'surviving ferry engineer' : 'fitted crane governor'
    );
    expect(quay.frame().threefold.quayRegulator.craneAvailable).toBe(false);
    expect(quay.recordIriFate('trapped', 'stale-arrival')).toBe(false);
  }
);
