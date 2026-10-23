import { createBrokenGateScene } from '../../../../src/core/browser/game/threefold/gatehouse.js';
import { createThreefoldSluiceScene } from '../../../../src/core/browser/game/threefold/sluice-scene.js';
import {
  restoreThreefoldSimulation,
  serializeThreefoldSimulation,
} from '../../../../src/core/browser/game/threefold/save.js';
import { renderThreefoldFrame } from '../../../../src/core/browser/game/threefold/renderer.js';
import { createScaleState } from '../../../../src/core/browser/game/threefold/spatial.js';
import { createThreefoldRuntime } from '../../../../src/core/browser/game/threefold/runtime.js';
import {
  createThreefoldSimulation,
  stepThreefoldSimulation,
} from '../../../../src/core/browser/game/threefold/simulation.js';
import {
  normalizeThreefoldWitnessLedger,
  presentThreefoldWitnessEntry,
} from '../../../../src/core/browser/game/threefold/witness-ledger.js';
import { presentThreefoldTestimony } from '../../../../src/core/browser/game/threefold/testimony.js';

const THRESHOLDS = {
  urgentAtMinutes: 4,
  surgeAtMinutes: 9,
  aftermathAtMinutes: 15,
};

describe('THREEFOLD witness ledger', () => {
  test('records the shown gate preview as knowledge and growth as the chosen operation', () => {
    const { state, decisionFrame } = forceReliefGateOpen();
    const choice = state.episode.witnessLedger[0];

    expect(choice).toMatchObject({
      id: 'witness-1',
      type: 'choice',
      action: 'grow',
      intention: 'Increase Mara scale by one rung.',
      knowledge: {
        crisisStage: decisionFrame.threefold.crisisStage,
        displayedStatus: decisionFrame.toast,
      },
      consequence: {
        gateState: 'forced-open',
        drainageState: 'at-risk',
        damagedGeometryIds: expect.arrayContaining(['relief-gate']),
      },
      relatedEventId: null,
    });
    expect(choice.knowledge.previewedGeometryIds).toContain('relief-gate');
    expect(choice.consequence.passengers).toBe('aboard');
  });

  test('exposes the saved history in the runtime journal and Mosslight frame', () => {
    const { state } = forceReliefGateOpen();
    const runtime = createThreefoldRuntime({ save: { load: () => state } });

    expect(runtime.getJournal()).toHaveLength(1);
    expect(runtime.getJournal()[0].title).toContain('CHOICE');
    expect(runtime.frame().threefold.witnessLedger).toEqual(
      runtime.getJournal()
    );
    expect(runtime.frame().threefold.testimony.accounts).toHaveLength(2);
    expect(runtime.frame().threefold.testimony.responsibility.status).toBe(
      'unresolved'
    );
  });

  test('presents conflicting attributed accounts and leaves relay responsibility unresolved', () => {
    const testimony = presentThreefoldTestimony();

    expect(testimony.accounts).toEqual([
      expect.objectContaining({
        speaker: 'Dock worker',
        statement: 'I shouted that the gate would fail toward the lower path.',
        evidence: expect.arrayContaining([
          expect.objectContaining({
            label: 'Opening callout',
            text: 'The tide is climbing. That gate will not hold.',
          }),
        ]),
      }),
      expect.objectContaining({
        speaker: 'Latchfolk watchkeeper',
        statement:
          'No warning that the gate would fail reached my post before the surge.',
      }),
    ]);
    expect(testimony.responsibility).toEqual({
      question:
        'Who was responsible for ensuring the gate warning reached the lower settlement?',
      status: 'unresolved',
    });
  });

  test('records the flood and later repair while keeping ferry losses linked', () => {
    let { state } = forceReliefGateOpen();
    const beforeSurge = renderThreefoldFrame(state);
    state = stepWithFrame(
      state,
      {
        type: 'wait',
        elapsedGameMinutes: 9 - state.crisis.elapsedMinutes,
      },
      beforeSurge
    );
    const observation = state.episode.witnessLedger.find(
      entry => entry.type === 'observation'
    );
    const choice = state.episode.witnessLedger[0];

    expect(observation).toMatchObject({
      type: 'observation',
      action: 'wait',
      knowledge: { displayedStatus: beforeSurge.toast },
      consequence: {
        crisisStage: 'surge',
        drainageState: 'flooded',
        passengers: 'lost',
        ferry: 'lost',
        latchfolk: 'lost',
      },
      relatedEventId: choice.id,
    });

    state = moveToLockingPawl(state);
    const beforeRepair = renderThreefoldFrame(state);
    state = stepWithFrame(state, { type: 'interact' }, beforeRepair);
    const repair = state.episode.witnessLedger.at(-1);

    expect(repair).toMatchObject({
      type: 'repair',
      action: 'interact',
      knowledge: { displayedStatus: beforeRepair.toast },
      consequence: {
        gateState: 'repaired',
        drainageState: 'flooded',
        passengers: 'lost',
        ferry: 'lost',
        latchfolk: 'lost',
      },
      relatedEventId: choice.id,
    });
    expect(presentThreefoldWitnessEntry(repair).title).toContain(
      'LATER REPAIR'
    );
    expect(state.episode.witnessLedger.map(entry => entry.id)).toEqual([
      'witness-1',
      'witness-2',
      'witness-3',
    ]);
  });

  test('lets a surviving watchkeeper share a one-time Iri lead before closure', () => {
    const aftermath = createSafeWatchkeeperAftermath();
    const prompt = renderThreefoldFrame(aftermath);

    expect(prompt.toast).toContain('A SPEAK WITH THE WATCHKEEPER');
    expect(prompt.threefold.iriWitnessLead).toBeNull();

    const heard = stepThreefoldSimulation(aftermath, { type: 'interact' });
    expect(heard.episode.witnessLedger.at(-1)).toMatchObject({
      type: 'observation',
      action: 'latchfolk-witness-lead',
      intention: 'Ask the surviving watchkeeper about a faint relay call.',
      consequence: {
        crisisStage: 'aftermath',
        latchfolk: 'safe',
      },
      relatedEventId: null,
    });
    expect(renderThreefoldFrame(heard)).toMatchObject({
      toast: expect.stringContaining('WATCHKEEPER ACCOUNT IN JOURNAL'),
      threefold: {
        iriWitnessLead: {
          title: "The Watchkeeper's relay account",
          text: expect.stringContaining('cannot say who sent it'),
        },
      },
    });

    const repeated = stepThreefoldSimulation(heard, { type: 'interact' });
    expect(repeated.episode.witnessLedger).toEqual(heard.episode.witnessLedger);
    expect(
      restoreThreefoldSimulation(serializeThreefoldSimulation(heard))
    ).toEqual(heard);
    expect(
      renderThreefoldFrame(
        restoreThreefoldSimulation(serializeThreefoldSimulation(heard))
      ).threefold.iriWitnessLead
    ).toEqual(renderThreefoldFrame(heard).threefold.iriWitnessLead);
  });

  test('keeps the watchkeeper lead optional and gated by survival, aftermath, and reach', () => {
    const aftermath = createSafeWatchkeeperAftermath();
    const outOfReach = {
      ...aftermath,
      player: createScaleState({ x: 2, y: 2 }),
    };
    const beforeAftermath = {
      ...aftermath,
      crisis: { ...aftermath.crisis, elapsedMinutes: 9, stage: 'surge' },
    };
    const lostWatchkeeper = {
      ...aftermath,
      episode: { ...aftermath.episode, latchfolk: 'lost' },
    };
    const unwarnedWatchkeeper = {
      ...aftermath,
      episode: { ...aftermath.episode, latchfolk: 'unwarned' },
    };
    const closedEpisode = {
      ...aftermath,
      episode: { ...aftermath.episode, closedBy: 'reported' },
    };
    const sluice = createThreefoldSimulation(
      THRESHOLDS,
      createThreefoldSluiceScene()
    );

    for (const candidate of [
      outOfReach,
      beforeAftermath,
      lostWatchkeeper,
      unwarnedWatchkeeper,
      closedEpisode,
    ]) {
      const result = stepThreefoldSimulation(candidate, { type: 'interact' });
      expect(result.episode.witnessLedger || []).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({ action: 'latchfolk-witness-lead' }),
        ])
      );
      expect(renderThreefoldFrame(result).threefold.iriWitnessLead).toBeNull();
    }
    expect(() =>
      stepThreefoldSimulation(sluice, { type: 'interact' })
    ).not.toThrow();
  });

  test('keeps report and destroyed-station departure available after the optional lead', () => {
    const heard = stepThreefoldSimulation(createSafeWatchkeeperAftermath(), {
      type: 'interact',
    });
    const scene = createBrokenGateScene();
    const console = scene.interactables.find(
      item => item.id === 'signal-station-console'
    );
    const road = scene.interactables.find(
      item => item.id === 'upland-road-exit'
    );
    const reported = stepThreefoldSimulation(
      { ...heard, player: createScaleState(console.position, { scale: -2 }) },
      { type: 'interact' }
    );
    const departed = stepThreefoldSimulation(
      {
        ...heard,
        player: createScaleState(road.position, {
          destroyedGeometryIds: ['signal-station'],
        }),
      },
      { type: 'interact' }
    );

    expect(reported.episode.closedBy).toBe('reported');
    expect(departed.episode.closedBy).toBe('departed');
    expect(
      renderThreefoldFrame(reported).threefold.iriWitnessLead
    ).not.toBeNull();
    expect(
      renderThreefoldFrame(departed).threefold.iriWitnessLead
    ).not.toBeNull();
  });

  test.each([
    [0, 'lost', 'Both passenger groups were still aboard'],
    [1, 'partial', 'One passenger group reached shore'],
    [2, 'evacuated', 'Both passenger groups reached shore'],
  ])(
    'lets Mara search the lost ferry after the surge with %i rescued groups',
    (rescuedGroups, passengerOutcome, accountStart) => {
      const aftermath = createFerryWreckAftermath(rescuedGroups);
      expect(aftermath.episode.passengers).toBe(passengerOutcome);
      expect(renderThreefoldFrame(aftermath).toast).toContain(
        'A SEARCH FERRY WRECK'
      );

      const searched = stepThreefoldSimulation(aftermath, {
        type: 'interact',
      });
      const entry = searched.episode.witnessLedger.at(-1);
      expect(entry).toMatchObject({
        type: 'observation',
        action: 'ferry-wreck-search',
        intention: 'Search the lost ferry wreck for its passengers.',
        consequence: {
          crisisStage: 'aftermath',
          passengers: passengerOutcome,
          ferry: 'lost',
        },
        relatedEventId: null,
      });
      expect(renderThreefoldFrame(searched)).toMatchObject({
        toast: expect.stringContaining('FERRY SEARCH IN JOURNAL'),
        threefold: {
          ferryWreckSearch: {
            title: 'Ferry wreck search',
            text: expect.stringContaining(accountStart),
          },
        },
      });
      expect(searched.episode.passengers).toBe(passengerOutcome);
      expect(searched.episode.ferry).toBe('lost');
      expect(
        stepThreefoldSimulation(searched, { type: 'interact' }).episode
          .witnessLedger
      ).toEqual(searched.episode.witnessLedger);
      expect(
        restoreThreefoldSimulation(serializeThreefoldSimulation(searched))
      ).toEqual(searched);
    }
  );

  test('keeps the wreck search optional and gated by loss, aftermath, reach, and closure', () => {
    const aftermath = createFerryWreckAftermath(0);
    const beforeAftermath = {
      ...aftermath,
      crisis: {
        ...aftermath.crisis,
        elapsedMinutes: 9,
        stage: 'surge',
      },
    };
    const ferryAfloat = {
      ...aftermath,
      episode: { ...aftermath.episode, ferry: 'afloat' },
    };
    const outOfReach = {
      ...aftermath,
      player: createScaleState({ x: 2, y: 2 }),
    };
    const closed = {
      ...aftermath,
      episode: { ...aftermath.episode, closedBy: 'departed' },
    };
    const alternateScene = createThreefoldSimulation(
      THRESHOLDS,
      createThreefoldSluiceScene()
    );

    for (const candidate of [
      beforeAftermath,
      ferryAfloat,
      outOfReach,
      closed,
      alternateScene,
    ]) {
      const result = stepThreefoldSimulation(candidate, { type: 'interact' });
      expect(result.episode.witnessLedger || []).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({ action: 'ferry-wreck-search' }),
        ])
      );
      expect(
        renderThreefoldFrame(result).threefold.ferryWreckSearch
      ).toBeFalsy();
    }
  });

  test('keeps report and destroyed-station departure available after a wreck search', () => {
    const searched = stepThreefoldSimulation(createFerryWreckAftermath(1), {
      type: 'interact',
    });
    const scene = createBrokenGateScene();
    const console = scene.interactables.find(
      item => item.id === 'signal-station-console'
    );
    const road = scene.interactables.find(
      item => item.id === 'upland-road-exit'
    );
    const reported = stepThreefoldSimulation(
      {
        ...searched,
        player: createScaleState(console.position, { scale: -2 }),
      },
      { type: 'interact' }
    );
    const departed = stepThreefoldSimulation(
      {
        ...searched,
        player: createScaleState(road.position, {
          destroyedGeometryIds: ['signal-station'],
        }),
      },
      { type: 'interact' }
    );

    expect(reported.episode.closedBy).toBe('reported');
    expect(departed.episode.closedBy).toBe('departed');
    expect(renderThreefoldFrame(reported).threefold.ferryWreckSearch).not.toBe(
      null
    );
    expect(renderThreefoldFrame(departed).threefold.ferryWreckSearch).not.toBe(
      null
    );
  });

  test('keeps a legacy repair unlinked when no breach entry was saved', () => {
    let { state } = forceReliefGateOpen();
    state = { ...state, episode: { ...state.episode, witnessLedger: [] } };
    state = moveToLockingPawl(state);
    const beforeRepair = renderThreefoldFrame(state);
    state = stepWithFrame(state, { type: 'interact' }, beforeRepair);

    expect(state.episode.witnessLedger.at(-1)).toMatchObject({
      type: 'repair',
      relatedEventId: null,
    });
  });

  test('presents later observations and falls back to a factual state summary', () => {
    let { state } = forceReliefGateOpen();
    const beforeSurge = renderThreefoldFrame(state);
    state = stepWithFrame(
      state,
      { type: 'wait', elapsedGameMinutes: 9 - state.crisis.elapsedMinutes },
      beforeSurge
    );
    const observation = state.episode.witnessLedger.at(-1);
    const presented = presentThreefoldWitnessEntry({
      ...observation,
      knowledge: { ...observation.knowledge, displayedStatus: '' },
    });

    expect(presented.title).toContain('OBSERVATION');
    expect(presented.knowledge).toMatch(/^Known then: scale /);
  });

  test('records a directionless move using its explicit game-time consequence', () => {
    const { state } = forceReliefGateOpen();
    const beforeMove = renderThreefoldFrame(state);
    const moved = stepWithFrame(state, { type: 'move' }, beforeMove);

    expect(moved.episode.witnessLedger.at(-1)).toMatchObject({
      type: 'observation',
      intention: 'Move through the scene.',
      relatedEventId: 'witness-1',
    });
  });

  test('persists entries and authored testimony in schema v6 while migrating v5 and retaining sluice schema v5', () => {
    const { state } = forceReliefGateOpen();
    const save = JSON.parse(serializeThreefoldSimulation(state));
    expect(save.schemaVersion).toBe(6);
    expect(restoreThreefoldSimulation(JSON.stringify(save))).toEqual(state);

    save.schemaVersion = 5;
    delete save.state.episode.testimony;
    expect(
      restoreThreefoldSimulation(JSON.stringify(save)).episode.testimony
    ).toEqual(state.episode.testimony);

    save.schemaVersion = 4;
    delete save.state.episode.witnessLedger;
    delete save.state.episode.testimony;
    expect(
      restoreThreefoldSimulation(JSON.stringify(save)).episode.witnessLedger
    ).toBeUndefined();
    expect(
      restoreThreefoldSimulation(JSON.stringify(save)).episode.testimony
    ).toEqual(state.episode.testimony);

    const sluice = createThreefoldSimulation(
      THRESHOLDS,
      createThreefoldSluiceScene()
    );
    const sluiceSave = JSON.parse(serializeThreefoldSimulation(sluice));
    expect(sluiceSave.schemaVersion).toBe(5);
    expect(sluiceSave.state.episode.testimony).toBeUndefined();
  });

  test('does not import altered testimony or accept a responsibility verdict', () => {
    const { state } = forceReliefGateOpen();
    const save = JSON.parse(serializeThreefoldSimulation(state));
    save.state.episode.testimony.accounts[0].statement =
      'The watchkeeper was to blame.';
    save.state.episode.testimony.responsibility.status = 'resolved';
    save.state.episode.testimony.responsibility.conclusion = 'watchkeeper';

    expect(
      restoreThreefoldSimulation(JSON.stringify(save)).episode.testimony
    ).toEqual(state.episode.testimony);
  });

  test('rejects invalid event order and unresolved repair references', () => {
    const { state } = forceReliefGateOpen();
    const event = state.episode.witnessLedger[0];
    expect(() => normalizeThreefoldWitnessLedger(null)).toThrow(
      'Witness ledger is invalid.'
    );
    expect(() =>
      normalizeThreefoldWitnessLedger([
        { ...event, id: 'witness-2', relatedEventId: 'witness-1' },
      ])
    ).toThrow('Witness ledger is invalid.');
    expect(() =>
      normalizeThreefoldWitnessLedger([
        { ...event, relatedEventId: 'witness-9' },
      ])
    ).toThrow('Witness ledger is invalid.');
  });
});

/**
 * Follow the authored route that damages the relief gate.
 * @returns {{state: ReturnType<typeof createThreefoldSimulation>, decisionFrame: Record<string, any>}} State and the frame shown before the breach.
 */
function forceReliefGateOpen() {
  const actions = [
    { type: 'grow' },
    { type: 'move', direction: 'up' },
    { type: 'shrink' },
    ...Array.from({ length: 3 }, () => ({ type: 'move', direction: 'up' })),
    ...Array.from({ length: 8 }, () => ({ type: 'move', direction: 'right' })),
    { type: 'grow' },
  ];
  let state = createThreefoldSimulation(THRESHOLDS);
  let decisionFrame;
  actions.forEach(action => {
    decisionFrame = renderThreefoldFrame(state);
    state = stepWithFrame(state, action, decisionFrame);
  });
  return { state, decisionFrame };
}

/**
 * Attach the exact current rendered frame to one deterministic action.
 * @param {ReturnType<typeof createThreefoldSimulation>} state Current simulation.
 * @param {Record<string, any>} action Player command.
 * @param {Record<string, any>} frame Pre-action frame.
 * @returns {ReturnType<typeof createThreefoldSimulation>} Resulting simulation.
 */
function stepWithFrame(state, action, frame) {
  return stepThreefoldSimulation(state, { ...action, preActionFrame: frame });
}

/**
 * Shrink and walk to the locking pawl beside the forced-open gate.
 * @param {ReturnType<typeof createThreefoldSimulation>} start State after surge.
 * @returns {ReturnType<typeof createThreefoldSimulation>} State beside the pawl.
 */
function moveToLockingPawl(start) {
  const actions = [
    ...Array.from({ length: 3 }, () => ({ type: 'shrink' })),
    ...Array.from({ length: 7 }, () => ({ type: 'move', direction: 'down' })),
  ];
  return actions.reduce(
    (state, action) =>
      stepWithFrame(state, action, renderThreefoldFrame(state)),
    start
  );
}

/**
 * Warn the Latchfolk and let their surviving watchkeeper remain until aftermath.
 * @returns {ReturnType<typeof createThreefoldSimulation>} In-range aftermath state.
 */
function createSafeWatchkeeperAftermath() {
  const scene = createBrokenGateScene();
  const watchkeeper = scene.interactables.find(
    item => item.id === 'latchfolk-watchkeeper'
  );
  let state = createThreefoldSimulation(THRESHOLDS, scene);
  state = {
    ...state,
    player: createScaleState(watchkeeper.position),
  };
  state = stepThreefoldSimulation(state, { type: 'interact' });
  state = stepThreefoldSimulation(state, {
    type: 'wait',
    elapsedGameMinutes: 9 - state.crisis.elapsedMinutes,
  });
  return stepThreefoldSimulation(state, {
    type: 'wait',
    elapsedGameMinutes: 15 - state.crisis.elapsedMinutes,
  });
}
/**
 * Rescue the requested passenger groups and advance the scene into aftermath.
 * @param {number} rescuedGroups Number of passenger groups saved before surge.
 * @returns {ReturnType<typeof createThreefoldSimulation>} At-reach aftermath state.
 */
function createFerryWreckAftermath(rescuedGroups) {
  const scene = createBrokenGateScene();
  const mooring = scene.interactables.find(
    item => item.id === 'ferry-mooring-line'
  );
  let state = createThreefoldSimulation(THRESHOLDS, scene);
  state = { ...state, player: createScaleState(mooring.position) };
  for (let group = 0; group < rescuedGroups; group += 1)
    state = stepThreefoldSimulation(state, { type: 'interact' });
  return stepThreefoldSimulation(state, {
    type: 'wait',
    elapsedGameMinutes: 15 - state.crisis.elapsedMinutes,
  });
}
