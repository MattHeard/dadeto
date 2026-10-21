import {
  createThreefoldWeftwaysScene,
  createThreefoldWeftwaysState,
  normalizeThreefoldWeftwaysState,
  THREEFOLD_WEFTWAYS_CARAVAN_CIRCLE_ID,
  THREEFOLD_WEFTWAYS_LOW_QUAY_ID,
  THREEFOLD_WEFTWAYS_PELL_ID,
  THREEFOLD_WEFTWAYS_PELL_BYPASS_ID,
  THREEFOLD_WEFTWAYS_QUAY_SPILL_ID,
  THREEFOLD_WEFTWAYS_ROOT_CROSSING_ID,
} from '../../../../src/core/browser/game/threefold/weftways.js';
import {
  createThreefoldSimulationSaveStore,
  restoreThreefoldSimulation,
  serializeThreefoldSimulation,
} from '../../../../src/core/browser/game/threefold/save.js';
import { renderThreefoldFrame } from '../../../../src/core/browser/game/threefold/renderer.js';
import {
  createThreefoldSimulation,
  stepThreefoldSimulation,
} from '../../../../src/core/browser/game/threefold/simulation.js';
import { isThreefoldInteractableInReach } from '../../../../src/core/browser/game/threefold/scene-utils.js';
import { heightAtScale } from '../../../../src/core/browser/game/threefold/spatial.js';

const CRISIS_THRESHOLDS = {
  urgentAtMinutes: 4,
  surgeAtMinutes: 9,
  aftermathAtMinutes: 15,
};

/** @returns {ReturnType<typeof createThreefoldSimulation>} Fresh isolated route. */
function createWeftwaysRun() {
  return createThreefoldSimulation(
    CRISIS_THRESHOLDS,
    createThreefoldWeftwaysScene()
  );
}

/**
 * Walk Mara to one flow control while keeping the other out of reach.
 * @param {ReturnType<typeof createThreefoldSimulation>} state Current simulation.
 * @param {string} targetId Control to approach.
 * @param {'left'|'right'} direction Movement direction.
 * @returns {ReturnType<typeof createThreefoldSimulation>} Updated simulation.
 */
function approachFlowControl(state, targetId, direction) {
  for (
    let step = 0;
    step < 40 && !isThreefoldInteractableInReach(state, targetId);
    step += 1
  )
    state = stepThreefoldSimulation(state, { type: 'move', direction });
  return state;
}

/**
 * Walk Mara into one authored interaction range.
 * @param {ReturnType<typeof createThreefoldSimulation>} state Current simulation.
 * @param {string} targetId Authored interaction identifier.
 * @returns {ReturnType<typeof createThreefoldSimulation>} Updated simulation.
 */
function approachInteractable(state, targetId) {
  const target = state.scene.interactables.find(({ id }) => id === targetId);
  for (
    let step = 0;
    step < 120 && !isThreefoldInteractableInReach(state, targetId);
    step += 1
  ) {
    const dx = target.position.x - state.player.position.x;
    const dy = target.position.y - state.player.position.y;
    const direction =
      Math.abs(dx) > Math.abs(dy)
        ? dx > 0
          ? 'right'
          : 'left'
        : dy > 0
          ? 'down'
          : 'up';
    state = stepThreefoldSimulation(state, { type: 'move', direction });
  }
  return state;
}

/**
 * @param {ReturnType<typeof createThreefoldSimulation>} state Current crossing.
 * @returns {ReturnType<typeof createThreefoldSimulation>} Updated crossing.
 */
const approachPell = state =>
  approachInteractable(state, THREEFOLD_WEFTWAYS_PELL_ID);

/**
 * @param {ReturnType<typeof createThreefoldSimulation>} state Current crossing.
 * @returns {ReturnType<typeof createThreefoldSimulation>} Updated crossing.
 */
const approachCaravanCircle = state =>
  approachInteractable(state, THREEFOLD_WEFTWAYS_CARAVAN_CIRCLE_ID);

describe('THREEFOLD Weftways caravan bypass', () => {
  test('authors the s = −2 Threadbound crossing and its oversized pack beetles', () => {
    const scene = createThreefoldWeftwaysScene();
    const state = createWeftwaysRun();
    const frame = renderThreefoldFrame(state);
    const beetles = scene.creatures;
    const beetleLength = beetles[0].bounds.max.x - beetles[0].bounds.min.x;

    expect(state.scene.id).toBe('weftways');
    expect(state.player.scale).toBe(-2);
    expect(heightAtScale(state.player.scale)).toBeCloseTo(0.2032, 4);
    expect(scene.interactables.map(({ id }) => id)).toContain('weftways-pell');
    expect(scene.interactables.map(({ id }) => id)).toContain(
      THREEFOLD_WEFTWAYS_CARAVAN_CIRCLE_ID
    );
    expect(beetles).toHaveLength(2);
    expect(beetles.every(({ growthRule }) => growthRule === 'overlap')).toBe(
      true
    );
    expect(beetleLength).toBeCloseTo(0.6, 5);
    expect(beetleLength / heightAtScale(-2)).toBeGreaterThan(2.9);
    expect(frame.quest).toBe('The Threadbound Crossing');
    expect(frame.threefold).toMatchObject({
      flowChoice: 'undecided',
      floodedGeometryIds: [],
      relayRecordRead: false,
      relayRecordShared: false,
      threadboundRelayRecord: null,
      threadboundRelayDisclosure: null,
      elapsedGameSeconds: 0,
    });
    expect(frame.threefold.packBeetleIds).toEqual(beetles.map(({ id }) => id));
    expect(frame.shapes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ x: 24, y: 80 }),
        expect.objectContaining({ x: 48, y: 80 }),
        expect.objectContaining({ x: 80, y: 64 }),
      ])
    );
    expect(frame.shapes.every(({ x, y }) => x % 8 === 0 && y % 8 === 0)).toBe(
      true
    );
    expect(
      frame.shapes
        .filter(({ type }) => type === 'rect')
        .every(({ width, height }) => width % 8 === 0 && height % 8 === 0)
    ).toBe(true);
    expect(createThreefoldWeftwaysState()).toEqual({
      flowChoice: 'undecided',
      floodedGeometryIds: [],
      relayRecordRead: false,
      relayRecordShared: false,
    });
    expect(scene.spawn).not.toBe(createThreefoldWeftwaysScene().spawn);

    const legacyEncounter = createWeftwaysRun();
    legacyEncounter.encounter.growthDeaths = undefined;
    expect(renderThreefoldFrame(legacyEncounter).threefold.flowChoice).toBe(
      'undecided'
    );
    const lostBeetle = createWeftwaysRun();
    lostBeetle.encounter.growthDeaths = [
      { creatureId: 'weftways-pack-beetle-1', cause: 'growth' },
    ];
    expect(
      renderThreefoldFrame(lostBeetle).shapes.find(
        ({ x, y }) => x === 24 && y === 80
      ).fill
    ).toBe('#526e4b');
  });

  test('an out-of-reach E leaves the channel open and advances route time only', () => {
    const state = createWeftwaysRun();
    const next = stepThreefoldSimulation(state, { type: 'interact' });

    expect(next.weftways).toEqual(state.weftways);
    expect(next.elapsedGameSeconds).toBe(15);
    expect(next.crisis).toEqual(state.crisis);
    expect(next.episode).toEqual(state.episode);
    expect(
      isThreefoldInteractableInReach(next, THREEFOLD_WEFTWAYS_PELL_BYPASS_ID)
    ).toBe(false);
    expect(
      isThreefoldInteractableInReach(next, THREEFOLD_WEFTWAYS_QUAY_SPILL_ID)
    ).toBe(false);
  });

  test.each([
    {
      choice: 'pell-bypass',
      target: THREEFOLD_WEFTWAYS_PELL_BYPASS_ID,
      other: THREEFOLD_WEFTWAYS_QUAY_SPILL_ID,
      direction: 'left',
      floodedGeometryIds: [THREEFOLD_WEFTWAYS_LOW_QUAY_ID],
      status: 'Pell trusts Mara; roots hold, quay floods.',
    },
    {
      choice: 'quay-spill',
      target: THREEFOLD_WEFTWAYS_QUAY_SPILL_ID,
      other: THREEFOLD_WEFTWAYS_PELL_BYPASS_ID,
      direction: 'right',
      floodedGeometryIds: [THREEFOLD_WEFTWAYS_ROOT_CROSSING_ID],
      status: 'Pell is wary; quay stays dry, root crossing floods.',
    },
  ])(
    'commits the reachable $choice and preserves its physical outcome',
    testCase => {
      let state = approachFlowControl(
        createWeftwaysRun(),
        testCase.target,
        testCase.direction
      );
      expect(isThreefoldInteractableInReach(state, testCase.target)).toBe(true);
      expect(isThreefoldInteractableInReach(state, testCase.other)).toBe(false);

      const previousTime = state.elapsedGameSeconds;
      state = stepThreefoldSimulation(state, { type: 'interact' });
      const frame = renderThreefoldFrame(state);

      expect(state.weftways).toEqual({
        flowChoice: testCase.choice,
        floodedGeometryIds: testCase.floodedGeometryIds,
        relayRecordRead: false,
        relayRecordShared: false,
      });
      expect(state.elapsedGameSeconds).toBe(previousTime + 15);
      expect(state.crisis).toEqual(createWeftwaysRun().crisis);
      expect(state.episode).toEqual(createWeftwaysRun().episode);
      expect(frame.toast).toBe(testCase.status);
      expect(frame.threefold.floodedGeometryIds).toEqual(
        testCase.floodedGeometryIds
      );
      expect(renderThreefoldFrame(state).threefold.flowChoice).toBe(
        testCase.choice
      );

      const repeated = stepThreefoldSimulation(state, { type: 'interact' });
      expect(repeated.weftways).toEqual(state.weftways);
      expect(repeated.elapsedGameSeconds).toBe(state.elapsedGameSeconds + 15);
    }
  );

  test('keeps Pell’s relay record unavailable until the crossing is chosen', () => {
    const state = createWeftwaysRun();
    const pell = state.scene.interactables.find(
      ({ id }) => id === THREEFOLD_WEFTWAYS_PELL_ID
    );
    state.player = { ...state.player, position: { ...pell.position } };

    const next = stepThreefoldSimulation(state, { type: 'interact' });

    expect(next.weftways.flowChoice).toBe('undecided');
    expect(next.weftways.relayRecordRead).toBe(false);
    expect(renderThreefoldFrame(next).threefold.threadboundRelayRecord).toBe(
      null
    );
  });

  test.each([
    {
      choice: 'pell-bypass',
      target: THREEFOLD_WEFTWAYS_PELL_BYPASS_ID,
      direction: 'left',
    },
    {
      choice: 'quay-spill',
      target: THREEFOLD_WEFTWAYS_QUAY_SPILL_ID,
      direction: 'right',
    },
  ])(
    'reveals, optionally shares, and saves relay evidence after $choice',
    testCase => {
      let state = approachFlowControl(
        createWeftwaysRun(),
        testCase.target,
        testCase.direction
      );
      state = stepThreefoldSimulation(state, { type: 'interact' });
      const committedChoice = state.weftways.flowChoice;
      state = approachPell(state);
      expect(
        isThreefoldInteractableInReach(state, THREEFOLD_WEFTWAYS_PELL_ID)
      ).toBe(true);

      state = stepThreefoldSimulation(state, { type: 'interact' });
      const frame = renderThreefoldFrame(state);
      const record = frame.threefold.threadboundRelayRecord;

      expect(state.weftways).toMatchObject({
        flowChoice: committedChoice,
        relayRecordRead: true,
        relayRecordShared: false,
      });
      expect(record.title).toBe('Threadbound relay ledger');
      expect(record.text).toContain('stopped arriving after an emergency');
      expect(record.text).toContain('what Iri knew');
      expect(record.text).toContain('who was responsible');
      expect(
        frame.shapes.some(({ text }) => text === 'REACH CAMP · E SHARE RECORD')
      ).toBe(true);

      state = approachCaravanCircle(state);
      expect(
        isThreefoldInteractableInReach(
          state,
          THREEFOLD_WEFTWAYS_CARAVAN_CIRCLE_ID
        )
      ).toBe(true);
      state = stepThreefoldSimulation(state, { type: 'interact' });
      const sharedFrame = renderThreefoldFrame(state);
      const disclosure = sharedFrame.threefold.threadboundRelayDisclosure;
      expect(state.weftways).toMatchObject({
        flowChoice: committedChoice,
        relayRecordRead: true,
        relayRecordShared: true,
      });
      expect(disclosure.title).toBe('What Mara shared with the caravan');
      expect(disclosure.text).toContain('stopped arriving after an emergency');
      expect(disclosure.text).toContain('what Iri knew');
      expect(disclosure.text).toContain('assign responsibility');
      expect(
        sharedFrame.shapes.some(
          ({ text }) => text === 'CARAVAN KNOWS THE RECORD'
        )
      ).toBe(true);
      const restored = restoreThreefoldSimulation(
        serializeThreefoldSimulation(state)
      );
      expect(restored.weftways).toEqual(state.weftways);
      expect(
        renderThreefoldFrame(restored).threefold.threadboundRelayDisclosure
      ).toEqual(disclosure);

      const repeated = stepThreefoldSimulation(state, { type: 'interact' });
      expect(repeated.weftways).toEqual(state.weftways);
      expect(repeated.weftways.flowChoice).toBe(committedChoice);
    }
  );

  test('sharing requires a discovered record and physical reach', () => {
    let state = approachFlowControl(
      createWeftwaysRun(),
      THREEFOLD_WEFTWAYS_PELL_BYPASS_ID,
      'left'
    );
    state = stepThreefoldSimulation(state, { type: 'interact' });
    state = approachCaravanCircle(state);
    expect(
      isThreefoldInteractableInReach(
        state,
        THREEFOLD_WEFTWAYS_CARAVAN_CIRCLE_ID
      )
    ).toBe(true);
    state = stepThreefoldSimulation(state, { type: 'interact' });
    expect(state.weftways).toMatchObject({
      relayRecordRead: false,
      relayRecordShared: false,
    });

    state = approachPell(state);
    state = stepThreefoldSimulation(state, { type: 'interact' });
    expect(state.weftways.relayRecordRead).toBe(true);
    expect(
      isThreefoldInteractableInReach(
        state,
        THREEFOLD_WEFTWAYS_CARAVAN_CIRCLE_ID
      )
    ).toBe(false);
    state = stepThreefoldSimulation(state, { type: 'interact' });
    expect(state.weftways.relayRecordShared).toBe(false);
  });

  test('exports both flow outcomes under an isolated schema-v1 save key', () => {
    let state = approachFlowControl(
      createWeftwaysRun(),
      THREEFOLD_WEFTWAYS_PELL_BYPASS_ID,
      'left'
    );
    state = stepThreefoldSimulation(state, { type: 'interact' });
    state.player = {
      ...state.player,
      destroyedGeometryIds: [THREEFOLD_WEFTWAYS_ROOT_CROSSING_ID],
    };
    const serialized = serializeThreefoldSimulation(state);
    const envelope = JSON.parse(serialized);
    const restored = restoreThreefoldSimulation(serialized);

    expect(envelope.schemaVersion).toBe(1);
    expect(envelope.sceneId).toBe('weftways');
    expect(restored).toEqual(state);
    expect(renderThreefoldFrame(restored).toast).toBe(
      'Pell trusts Mara; roots hold, quay floods.'
    );
    const quaySpill = stepThreefoldSimulation(
      approachFlowControl(
        createWeftwaysRun(),
        THREEFOLD_WEFTWAYS_QUAY_SPILL_ID,
        'right'
      ),
      { type: 'interact' }
    );
    expect(
      renderThreefoldFrame(
        restoreThreefoldSimulation(serializeThreefoldSimulation(quaySpill))
      ).toast
    ).toBe('Pell is wary; quay stays dry, root crossing floods.');
    expect(renderThreefoldFrame(restored).threefold.floodedGeometryIds).toEqual(
      [THREEFOLD_WEFTWAYS_LOW_QUAY_ID]
    );

    const records = new Map();
    const storage = {
      getItem: key => records.get(key) ?? null,
      setItem: (key, value) => records.set(key, value),
      removeItem: key => records.delete(key),
    };
    const routeStore = createThreefoldSimulationSaveStore(storage, 'weftways');
    const defaultStore = createThreefoldSimulationSaveStore(storage);
    expect(routeStore.save(state)).toBe(true);
    expect(
      defaultStore.save(createThreefoldSimulation(CRISIS_THRESHOLDS))
    ).toBe(true);
    expect([...records.keys()]).toEqual([
      'dadeto.threefold.simulation-save.v1.weftways',
      'dadeto.threefold.simulation-save.v1',
    ]);
    expect(routeStore.load()).toEqual(state);
    expect(defaultStore.load().scene.id).toBe('broken-gate');

    expect(() => normalizeThreefoldWeftwaysState(null)).toThrow(
      'Weftways state is invalid.'
    );
    expect(() =>
      normalizeThreefoldWeftwaysState({ flowChoice: 'unknown' })
    ).toThrow('Weftways flow choice is invalid.');
    expect(() =>
      normalizeThreefoldWeftwaysState({
        flowChoice: 'pell-bypass',
        floodedGeometryIds: [THREEFOLD_WEFTWAYS_ROOT_CROSSING_ID],
      })
    ).toThrow('Weftways flood footprint is inconsistent.');
    expect(
      restoreThreefoldSimulation(
        JSON.stringify({ ...envelope, schemaVersion: 2 })
      )
    ).toBeNull();
    const legacyRoute = JSON.parse(serialized);
    delete legacyRoute.state.weftways.relayRecordRead;
    delete legacyRoute.state.weftways.relayRecordShared;
    expect(
      restoreThreefoldSimulation(JSON.stringify(legacyRoute)).weftways
        .relayRecordRead
    ).toBe(false);
    expect(
      restoreThreefoldSimulation(JSON.stringify(legacyRoute)).weftways
        .relayRecordShared
    ).toBe(false);
    expect(
      normalizeThreefoldWeftwaysState({ flowChoice: 'pell-bypass' })
        .relayRecordRead
    ).toBe(false);
    expect(
      normalizeThreefoldWeftwaysState({ flowChoice: 'pell-bypass' })
        .relayRecordShared
    ).toBe(false);
    expect(() =>
      normalizeThreefoldWeftwaysState({
        flowChoice: 'pell-bypass',
        relayRecordRead: 'yes',
      })
    ).toThrow('Weftways relay record state is invalid.');
    expect(() =>
      normalizeThreefoldWeftwaysState({
        flowChoice: 'pell-bypass',
        relayRecordRead: null,
      })
    ).toThrow('Weftways relay record state is invalid.');
    expect(() =>
      normalizeThreefoldWeftwaysState({
        flowChoice: 'undecided',
        relayRecordRead: true,
      })
    ).toThrow('Weftways relay record requires a flow choice.');
    expect(() =>
      normalizeThreefoldWeftwaysState({
        flowChoice: 'pell-bypass',
        relayRecordShared: 'yes',
      })
    ).toThrow('Weftways relay disclosure state is invalid.');
    expect(() =>
      normalizeThreefoldWeftwaysState({
        flowChoice: 'pell-bypass',
        relayRecordShared: true,
      })
    ).toThrow('Weftways relay disclosure requires the record.');
  });

  test('scale growth through the quay homes leaves durable rubble', () => {
    const state = createWeftwaysRun();
    state.player = { ...state.player, position: { x: 1.56, y: 0.3 } };

    expect(
      renderThreefoldFrame(state).threefold.growthPreviewGeometryIds
    ).toContain(THREEFOLD_WEFTWAYS_LOW_QUAY_ID);
    const grown = stepThreefoldSimulation(state, { type: 'grow' });
    const restored = restoreThreefoldSimulation(
      serializeThreefoldSimulation(grown)
    );

    expect(grown.player.scale).toBe(-1);
    expect(grown.player.destroyedGeometryIds).toContain(
      THREEFOLD_WEFTWAYS_LOW_QUAY_ID
    );
    expect(restored.player.destroyedGeometryIds).toContain(
      THREEFOLD_WEFTWAYS_LOW_QUAY_ID
    );
  });
});
