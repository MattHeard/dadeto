import { createThreefoldSluiceScene } from '../../../../src/core/browser/game/threefold/sluice-scene.js';
import {
  restoreThreefoldSimulation,
  serializeThreefoldSimulation,
} from '../../../../src/core/browser/game/threefold/save.js';
import { renderThreefoldFrame } from '../../../../src/core/browser/game/threefold/renderer.js';
import { createThreefoldRuntime } from '../../../../src/core/browser/game/threefold/runtime.js';
import {
  createThreefoldSimulation,
  stepThreefoldSimulation,
} from '../../../../src/core/browser/game/threefold/simulation.js';
import { normalizeThreefoldWitnessLedger } from '../../../../src/core/browser/game/threefold/witness-ledger.js';

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
    expect(state.episode.witnessLedger.map(entry => entry.id)).toEqual([
      'witness-1',
      'witness-2',
      'witness-3',
    ]);
  });

  test('persists entries in schema v5 while reading v4 and retaining sluice schema v4', () => {
    const { state } = forceReliefGateOpen();
    const save = JSON.parse(serializeThreefoldSimulation(state));
    expect(save.schemaVersion).toBe(5);
    expect(restoreThreefoldSimulation(JSON.stringify(save))).toEqual(state);

    save.schemaVersion = 4;
    delete save.state.episode.witnessLedger;
    expect(
      restoreThreefoldSimulation(JSON.stringify(save)).episode.witnessLedger
    ).toBeUndefined();

    const sluice = createThreefoldSimulation(
      THRESHOLDS,
      createThreefoldSluiceScene()
    );
    expect(JSON.parse(serializeThreefoldSimulation(sluice)).schemaVersion).toBe(
      4
    );
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
