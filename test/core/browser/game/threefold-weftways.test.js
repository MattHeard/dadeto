import {
  createThreefoldWeftwaysScene,
  createThreefoldWeftwaysState,
  normalizeThreefoldWeftwaysState,
  THREEFOLD_WEFTWAYS_CARAVAN_CIRCLE_ID,
  THREEFOLD_WEFTWAYS_BRAZIER_ID,
  THREEFOLD_WEFTWAYS_LOW_QUAY_ID,
  THREEFOLD_WEFTWAYS_PELL_ID,
  THREEFOLD_WEFTWAYS_PELL_BYPASS_ID,
  THREEFOLD_WEFTWAYS_PRIVATE_CACHE_ID,
  THREEFOLD_WEFTWAYS_QUAY_SPILL_ID,
  THREEFOLD_WEFTWAYS_RESTITUTION_TABLE_ID,
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
  previewThreefoldGrowthEffects,
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

/**
 * @param {ReturnType<typeof createThreefoldSimulation>} state Current crossing.
 * @returns {ReturnType<typeof createThreefoldSimulation>} Updated crossing.
 */
const approachPrivateCache = state =>
  approachInteractable(state, THREEFOLD_WEFTWAYS_PRIVATE_CACHE_ID);

/**
 * @param {ReturnType<typeof createThreefoldSimulation>} state Current crossing.
 * @returns {ReturnType<typeof createThreefoldSimulation>} Updated crossing.
 */
const approachBrazier = state =>
  approachInteractable(state, THREEFOLD_WEFTWAYS_BRAZIER_ID);

/**
 * @param {ReturnType<typeof createThreefoldSimulation>} state Current crossing.
 * @returns {ReturnType<typeof createThreefoldSimulation>} Updated crossing.
 */
const approachRestitutionTable = state =>
  approachInteractable(state, THREEFOLD_WEFTWAYS_RESTITUTION_TABLE_ID);

/**
 * Place the player at one authored interaction point for a simulation assertion.
 * @param {ReturnType<typeof createThreefoldSimulation>} state Current crossing.
 * @param {string} interactableId Target interaction point.
 * @returns {ReturnType<typeof createThreefoldSimulation>} Crossing at the target.
 */
function placeAtWeftwaysInteractable(state, interactableId) {
  const target = state.scene.interactables.find(
    ({ id }) => id === interactableId
  );
  return {
    ...state,
    player: { ...state.player, position: { ...target.position } },
  };
}

/**
 * Interact at one authored point without simulating the travel between points.
 * @param {ReturnType<typeof createThreefoldSimulation>} state Current crossing.
 * @param {string} interactableId Target interaction point.
 * @returns {ReturnType<typeof createThreefoldSimulation>} Updated crossing.
 */
function interactAtWeftwaysPoint(state, interactableId) {
  return stepThreefoldSimulation(
    placeAtWeftwaysInteractable(state, interactableId),
    { type: 'interact' }
  );
}

/** @returns {ReturnType<typeof createThreefoldSimulation>} Mara inside Pell at scale −3. */
function createPellGrowthPreviewState() {
  const state = stepThreefoldSimulation(createWeftwaysRun(), {
    type: 'shrink',
  });
  return {
    ...state,
    player: { ...state.player, position: { x: 1.12, y: 0.56 } },
  };
}

/** @returns {ReturnType<typeof createThreefoldSimulation>} Route after Pell's saved growth death. */
function createPellGrowthDeathState() {
  return stepThreefoldSimulation(createPellGrowthPreviewState(), {
    type: 'grow',
  });
}

/** @returns {ReturnType<typeof createThreefoldSimulation>} Reloaded Pell growth-death route. */
function reloadPellGrowthDeathState() {
  return restoreThreefoldSimulation(
    serializeThreefoldSimulation(createPellGrowthDeathState())
  );
}

describe('THREEFOLD Weftways caravan bypass', () => {
  test('authors the s = −2 Threadbound crossing and its oversized pack beetles', () => {
    const scene = createThreefoldWeftwaysScene();
    const state = createWeftwaysRun();
    const frame = renderThreefoldFrame(state);
    const beetles = scene.creatures.filter(({ id }) =>
      id.startsWith('weftways-pack-beetle-')
    );
    const pell = scene.creatures.find(
      ({ id }) => id === THREEFOLD_WEFTWAYS_PELL_ID
    );
    const beetleLength = beetles[0].bounds.max.x - beetles[0].bounds.min.x;

    expect(state.scene.id).toBe('weftways');
    expect(state.player.scale).toBe(-2);
    expect(state.player.minimumUnlockedScale).toBe(-3);
    expect(heightAtScale(state.player.scale)).toBeCloseTo(0.2032, 4);
    expect(scene.interactables.map(({ id }) => id)).toContain('weftways-pell');
    expect(scene.interactables.map(({ id }) => id)).toContain(
      THREEFOLD_WEFTWAYS_CARAVAN_CIRCLE_ID
    );
    expect(scene.interactables.map(({ id }) => id)).toContain(
      THREEFOLD_WEFTWAYS_PRIVATE_CACHE_ID
    );
    expect(scene.interactables.map(({ id }) => id)).toContain(
      THREEFOLD_WEFTWAYS_BRAZIER_ID
    );
    expect(scene.interactables.map(({ id }) => id)).toContain(
      THREEFOLD_WEFTWAYS_RESTITUTION_TABLE_ID
    );
    expect(beetles).toHaveLength(2);
    expect(beetles.every(({ growthRule }) => growthRule === 'overlap')).toBe(
      true
    );
    expect(beetleLength).toBeCloseTo(0.6, 5);
    expect(beetleLength / heightAtScale(-2)).toBeGreaterThan(2.9);
    expect(pell).toMatchObject({
      id: THREEFOLD_WEFTWAYS_PELL_ID,
      displayName: 'PELL',
      growthRule: 'overlap',
    });
    expect(frame.quest).toBe('The Threadbound Crossing');
    expect(frame.threefold).toMatchObject({
      flowChoice: 'undecided',
      floodedGeometryIds: [],
      relayRecordRead: false,
      relayRecordShared: false,
      relayRecordConcealed: false,
      relayRecordDestroyed: false,
      relayRestitutionNegotiated: false,
      threadboundRelayRecord: null,
      threadboundRelayDisclosure: null,
      threadboundRelayConcealment: null,
      threadboundRelayDestruction: null,
      elapsedGameSeconds: 0,
    });
    expect(frame.threefold.packBeetleIds).toEqual(beetles.map(({ id }) => id));
    expect(frame.shapes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ x: 24, y: 80 }),
        expect.objectContaining({ x: 48, y: 80 }),
        expect.objectContaining({ x: 80, y: 64 }),
        expect.objectContaining({ x: 16, y: 64, fill: '#e16b5a' }),
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
      relayRecordConcealed: false,
      relayRecordDestroyed: false,
      relayRestitutionNegotiated: false,
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
        relayRecordConcealed: false,
        relayRecordDestroyed: false,
        relayRestitutionNegotiated: false,
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
    { flowChoice: 'undecided', response: {} },
    {
      flowChoice: 'pell-bypass',
      response: { relayRecordRead: true, relayRecordShared: true },
    },
    { flowChoice: 'quay-spill', response: {} },
    {
      flowChoice: 'quay-spill',
      response: { relayRecordRead: true, relayRecordShared: true },
    },
    {
      flowChoice: 'quay-spill',
      response: { relayRecordRead: true, relayRecordConcealed: true },
    },
    {
      flowChoice: 'quay-spill',
      response: { relayRecordRead: true, relayRecordDestroyed: true },
    },
    {
      flowChoice: 'quay-spill',
      response: { relayRecordRead: true, relayRestitutionNegotiated: true },
    },
  ])(
    'derives independent publication from $flowChoice regardless of Mara’s response',
    testCase => {
      const state = createWeftwaysRun();
      state.weftways = normalizeThreefoldWeftwaysState({
        flowChoice: testCase.flowChoice,
        ...testCase.response,
      });
      const frame = renderThreefoldFrame(state);
      const publication = frame.threefold.threadboundIndependentPublication;

      if (testCase.flowChoice === 'quay-spill') {
        expect(publication.title).toBe('Pell’s independent relay notice');
        expect(publication.text).toContain('root crossing flooded');
        expect(publication.text).toContain('relay tokens stopped arriving');
        expect(publication.text).toContain('what Iri knew');
        expect(publication.text).toContain('assign responsibility');
        expect(frame.shapes).toContainEqual(
          expect.objectContaining({ x: 48, y: 48, fill: '#bfd77c' })
        );
        const restored = restoreThreefoldSimulation(
          serializeThreefoldSimulation(state)
        );
        expect(
          renderThreefoldFrame(restored).threefold
            .threadboundIndependentPublication
        ).toEqual(publication);
      } else {
        expect(publication).toBeNull();
      }
      expect(frame.shapes.every(({ x, y }) => x % 8 === 0 && y % 8 === 0)).toBe(
        true
      );
    }
  );

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
    'reveals relay evidence without requiring Iri’s report after $choice',
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

      expect(frame.threefold).not.toHaveProperty('iriRecordedConfession');
      expect(state.weftways).toMatchObject({
        flowChoice: committedChoice,
        relayRecordRead: true,
        relayRecordShared: false,
        relayRecordConcealed: false,
      });
      expect(record.title).toBe('Threadbound relay ledger');
      expect(record.text).toContain('stopped arriving after an emergency');
      expect(record.text).toContain('what Iri knew');
      expect(record.text).toContain('who was responsible');
      expect(
        frame.shapes.some(
          ({ text }) => text === 'E SHARE · REPAIR · KEEP · DESTROY'
        )
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
        relayRecordConcealed: false,
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

      const afterPrivateCache = stepThreefoldSimulation(
        approachPrivateCache(state),
        { type: 'interact' }
      );
      expect(afterPrivateCache.weftways).toEqual(state.weftways);
      expect(
        stepThreefoldSimulation(approachBrazier(state), { type: 'interact' })
          .weftways
      ).toEqual(state.weftways);
    }
  );
});

describe('THREEFOLD Weftways negotiator loss', () => {
  test('previews, saves, and permanently renders Pell’s growth death', () => {
    let state = createPellGrowthPreviewState();

    expect(state.player.scale).toBe(-3);
    expect(previewThreefoldGrowthEffects(state).creatureIds).toContain(
      THREEFOLD_WEFTWAYS_PELL_ID
    );
    expect(
      renderThreefoldFrame(state).shapes.map(({ text }) => text)
    ).toContain('A KILLS PELL');

    state = stepThreefoldSimulation(state, { type: 'grow' });
    expect(state.encounter.growthDeaths).toContainEqual({
      creatureId: THREEFOLD_WEFTWAYS_PELL_ID,
      cause: 'growth',
    });
    const restored = restoreThreefoldSimulation(
      serializeThreefoldSimulation(state)
    );
    expect(restored.encounter.growthDeaths).toContainEqual({
      creatureId: THREEFOLD_WEFTWAYS_PELL_ID,
      cause: 'growth',
    });
    const frame = renderThreefoldFrame(restored);
    expect(frame.threefold).toMatchObject({
      pellDied: true,
      threadboundPellOutcome: {
        title: 'Pell’s death and the caravan relay keeper',
      },
    });
    expect(frame.shapes).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ x: 80, y: 56 }),
        expect.objectContaining({ x: 80, y: 64 }),
      ])
    );
  });

  test('moves Pell’s ledger contact to the keeper and preserves read/share actions', () => {
    let state = reloadPellGrowthDeathState();
    state = interactAtWeftwaysPoint(state, THREEFOLD_WEFTWAYS_PELL_ID);
    expect(state.weftways.relayRecordRead).toBe(false);

    state = interactAtWeftwaysPoint(state, THREEFOLD_WEFTWAYS_PELL_BYPASS_ID);
    expect(state.weftways.flowChoice).toBe('pell-bypass');
    state = interactAtWeftwaysPoint(
      state,
      THREEFOLD_WEFTWAYS_CARAVAN_CIRCLE_ID
    );
    expect(state.weftways.relayRecordRead).toBe(true);
    let frame = renderThreefoldFrame(state);
    expect(frame.threefold.threadboundRelayRecord.text).toContain(
      'The relay keeper preserves Pell’s caravan ledger'
    );
    expect(frame.toast).toContain('relay keeper');

    state = interactAtWeftwaysPoint(
      state,
      THREEFOLD_WEFTWAYS_CARAVAN_CIRCLE_ID
    );
    expect(state.weftways.relayRecordShared).toBe(true);
    frame = renderThreefoldFrame(state);
    expect(frame.toast).toContain('shared Pell’s record with the relay keeper');
  });

  test('lets the keeper preserve the ledger privately after Pell dies', () => {
    let state = {
      ...reloadPellGrowthDeathState(),
      weftways: normalizeThreefoldWeftwaysState({
        flowChoice: 'pell-bypass',
      }),
    };
    state = interactAtWeftwaysPoint(
      state,
      THREEFOLD_WEFTWAYS_CARAVAN_CIRCLE_ID
    );
    state = interactAtWeftwaysPoint(state, THREEFOLD_WEFTWAYS_PRIVATE_CACHE_ID);

    expect(state.weftways.relayRecordConcealed).toBe(true);
    expect(renderThreefoldFrame(state).toast).toContain(
      'keeps Pell’s record private from the relay keeper'
    );
  });

  test('keeps the post-spill offer and independent notice with the relay keeper', () => {
    let state = {
      ...reloadPellGrowthDeathState(),
      weftways: normalizeThreefoldWeftwaysState({
        flowChoice: 'quay-spill',
      }),
    };
    let frame = renderThreefoldFrame(state);
    expect(frame.toast).toContain(
      'relay keeper preserves Pell’s crossing choice'
    );
    expect(frame.shapes.map(({ text }) => text)).toContain(
      'REACH CARAVAN CIRCLE · E READ COPY'
    );

    state = interactAtWeftwaysPoint(
      state,
      THREEFOLD_WEFTWAYS_CARAVAN_CIRCLE_ID
    );
    state = interactAtWeftwaysPoint(
      state,
      THREEFOLD_WEFTWAYS_RESTITUTION_TABLE_ID
    );
    frame = renderThreefoldFrame(state);
    expect(frame.threefold.threadboundIndependentPublication.title).toBe(
      'Caravan relay keeper’s independent notice'
    );
    expect(frame.toast).toContain('Pell’s answer is unknown');
    expect(frame.threefold.threadboundRelayRestitution.text).toContain(
      'Pell’s answer is unknown'
    );
  });
});

describe('THREEFOLD Threadbound privacy choice', () => {
  test('Mara can keep Pell’s ledger private once, only after reading it in reach', () => {
    let state = approachFlowControl(
      createWeftwaysRun(),
      THREEFOLD_WEFTWAYS_PELL_BYPASS_ID,
      'left'
    );
    state = stepThreefoldSimulation(state, { type: 'interact' });
    const committedRoute = {
      flowChoice: state.weftways.flowChoice,
      floodedGeometryIds: [...state.weftways.floodedGeometryIds],
    };

    state = approachPrivateCache(state);
    expect(
      isThreefoldInteractableInReach(state, THREEFOLD_WEFTWAYS_PRIVATE_CACHE_ID)
    ).toBe(true);
    state = stepThreefoldSimulation(state, { type: 'interact' });
    expect(state.weftways.relayRecordConcealed).toBe(false);

    state = approachPell(state);
    state = stepThreefoldSimulation(state, { type: 'interact' });
    expect(state.weftways.relayRecordRead).toBe(true);
    expect(
      isThreefoldInteractableInReach(state, THREEFOLD_WEFTWAYS_PRIVATE_CACHE_ID)
    ).toBe(false);
    state = stepThreefoldSimulation(state, { type: 'interact' });
    expect(state.weftways.relayRecordConcealed).toBe(false);

    state = approachPrivateCache(state);
    expect(
      isThreefoldInteractableInReach(state, THREEFOLD_WEFTWAYS_PRIVATE_CACHE_ID)
    ).toBe(true);
    state = stepThreefoldSimulation(state, { type: 'interact' });
    const frame = renderThreefoldFrame(state);
    const concealment = frame.threefold.threadboundRelayConcealment;
    expect(state.weftways).toMatchObject({
      ...committedRoute,
      relayRecordRead: true,
      relayRecordShared: false,
      relayRecordConcealed: true,
    });
    expect(concealment.title).toBe('What Mara kept private');
    expect(concealment.text).toContain(
      'chose not to share Pell’s relay ledger'
    );
    expect(concealment.text).toContain('final sender');
    expect(concealment.text).toContain('what Iri knew');
    expect(concealment.text).toContain('assign responsibility');
    expect(
      frame.shapes.some(({ text }) => text === 'MARA KEPT THE RECORD PRIVATE')
    ).toBe(true);
    expect(frame.shapes.every(({ x, y }) => x % 8 === 0 && y % 8 === 0)).toBe(
      true
    );

    const restored = restoreThreefoldSimulation(
      serializeThreefoldSimulation(state)
    );
    expect(restored.weftways).toEqual(state.weftways);
    expect(
      renderThreefoldFrame(restored).threefold.threadboundRelayConcealment
    ).toEqual(concealment);

    const atCaravanCircle = approachCaravanCircle(state);
    const repeated = stepThreefoldSimulation(atCaravanCircle, {
      type: 'interact',
    });
    expect(repeated.weftways).toEqual(state.weftways);
    expect(
      stepThreefoldSimulation(approachBrazier(state), { type: 'interact' })
        .weftways
    ).toEqual(state.weftways);
  });
});

describe('THREEFOLD Threadbound ledger destruction', () => {
  test('destroys the discovered ledger once at the reachable brazier', () => {
    let state = stepThreefoldSimulation(
      approachFlowControl(
        createWeftwaysRun(),
        THREEFOLD_WEFTWAYS_PELL_BYPASS_ID,
        'left'
      ),
      { type: 'interact' }
    );
    const committedChoice = state.weftways.flowChoice;
    const floodedGeometryIds = [...state.weftways.floodedGeometryIds];

    state = approachBrazier(state);
    expect(
      isThreefoldInteractableInReach(state, THREEFOLD_WEFTWAYS_BRAZIER_ID)
    ).toBe(true);
    state = stepThreefoldSimulation(state, { type: 'interact' });
    expect(state.weftways.relayRecordDestroyed).toBe(false);

    state = approachPell(state);
    state = stepThreefoldSimulation(state, { type: 'interact' });
    expect(state.weftways.relayRecordRead).toBe(true);
    expect(
      isThreefoldInteractableInReach(state, THREEFOLD_WEFTWAYS_BRAZIER_ID)
    ).toBe(false);
    state = stepThreefoldSimulation(state, { type: 'interact' });
    expect(state.weftways.relayRecordDestroyed).toBe(false);

    state = approachBrazier(state);
    const crisis = state.crisis;
    const episode = state.episode;
    state = stepThreefoldSimulation(state, { type: 'interact' });
    const frame = renderThreefoldFrame(state);
    const destruction = frame.threefold.threadboundRelayDestruction;
    expect(state.weftways).toMatchObject({
      flowChoice: committedChoice,
      floodedGeometryIds,
      relayRecordRead: true,
      relayRecordShared: false,
      relayRecordConcealed: false,
      relayRecordDestroyed: true,
      relayRestitutionNegotiated: false,
    });
    expect(state.crisis).toEqual(crisis);
    expect(state.episode).toEqual(episode);
    expect(frame.threefold.threadboundRelayRecord).toBeNull();
    expect(destruction.title).toBe('What happened to the Threadbound ledger');
    expect(destruction.text).toContain('Mara destroyed Pell’s relay ledger');
    expect(destruction.text).toContain('final sender');
    expect(destruction.text).toContain('what Iri knew');
    expect(destruction.text).toContain('assign responsibility');
    expect(
      frame.shapes.some(
        ({ text }) => text === 'LEDGER DESTROYED · FACTS UNRESOLVED'
      )
    ).toBe(true);
    expect(frame.shapes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ x: 16, y: 64, fill: '#8aa27b' }),
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

    const serialized = serializeThreefoldSimulation(state);
    expect(JSON.parse(serialized).schemaVersion).toBe(4);
    const restored = restoreThreefoldSimulation(serialized);
    expect(restored.weftways).toEqual(state.weftways);
    expect(
      renderThreefoldFrame(restored).threefold.threadboundRelayDestruction
    ).toEqual(destruction);
    expect(
      stepThreefoldSimulation(restored, { type: 'interact' }).weftways
    ).toEqual(state.weftways);
    expect(
      stepThreefoldSimulation(approachPell(restored), { type: 'interact' })
        .weftways
    ).toEqual(state.weftways);
  });
});

/**
 * @param {{state: any, testCase: any, committedChoice: string, floodedGeometryIds: string[], crisis: any, episode: any}} context Negotiated outcome and unchanged crossing facts.
 * @returns {{restitution: any}} Rendered response.
 */
function assertNegotiatedRestitutionOutcome(context) {
  const {
    state,
    testCase,
    committedChoice,
    floodedGeometryIds,
    crisis,
    episode,
  } = context;
  const frame = renderThreefoldFrame(state);
  const restitution = frame.threefold.threadboundRelayRestitution;
  expect(state.weftways).toMatchObject({
    flowChoice: committedChoice,
    floodedGeometryIds,
    relayRecordRead: true,
    relayRecordShared: false,
    relayRecordConcealed: false,
    relayRecordDestroyed: false,
    relayRestitutionNegotiated: true,
  });
  expect(state.crisis).toEqual(crisis);
  expect(state.episode).toEqual(episode);
  expect(restitution.title).toBe('Threadbound relay restitution');
  expect(restitution.text).toContain(
    'carry replacement relay tokens to downstream settlements'
  );
  expect(restitution.text).toContain(testCase.response);
  expect(restitution.text).toContain('final sender');
  expect(restitution.text).toContain('what Iri knew');
  expect(restitution.text).toContain('assign responsibility');
  expect(frame.toast).toBe(testCase.toast);
  expect(frame.shapes.some(({ text }) => text === testCase.caption)).toBe(true);
  expect(frame.shapes).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ x: 64, y: 64, fill: '#bfd77c' }),
    ])
  );
  expect(frame.shapes.every(({ x, y }) => x % 8 === 0 && y % 8 === 0)).toBe(
    true
  );
  return { restitution };
}

/**
 * @param {ReturnType<typeof createThreefoldSimulation>} state Saved route.
 * @param {any} restitution Expected accessible outcome.
 * @returns {ReturnType<typeof restoreThreefoldSimulation>} Restored route.
 */
function assertRestitutionSaveRoundTrip(state, restitution) {
  const serialized = serializeThreefoldSimulation(state);
  expect(JSON.parse(serialized).schemaVersion).toBe(4);
  const restored = restoreThreefoldSimulation(serialized);
  expect(restored.weftways).toEqual(state.weftways);
  expect(
    renderThreefoldFrame(restored).threefold.threadboundRelayRestitution
  ).toEqual(restitution);
  return restored;
}

describe('THREEFOLD Threadbound restitution negotiation', () => {
  test.each([
    {
      choice: 'pell-bypass',
      target: THREEFOLD_WEFTWAYS_PELL_BYPASS_ID,
      direction: 'left',
      response: 'Pell accepts the plan.',
      toast:
        'Pell accepts Mara’s offer to carry relay tokens and help restore the route.',
      caption: 'PELL ACCEPTS · TOKENS AND ROUTE REPAIR',
    },
    {
      choice: 'quay-spill',
      target: THREEFOLD_WEFTWAYS_QUAY_SPILL_ID,
      direction: 'right',
      response: 'Pell defers final terms',
      toast: 'Pell defers terms until root-channel damage is assessed.',
      caption: 'PELL DEFERS · ROOT DAMAGE TO ASSESS',
    },
  ])('negotiates a one-time repair offer after $choice', testCase => {
    let state = stepThreefoldSimulation(
      approachFlowControl(
        createWeftwaysRun(),
        testCase.target,
        testCase.direction
      ),
      { type: 'interact' }
    );
    const committedChoice = state.weftways.flowChoice;
    const floodedGeometryIds = [...state.weftways.floodedGeometryIds];

    state = approachRestitutionTable(state);
    expect(
      isThreefoldInteractableInReach(
        state,
        THREEFOLD_WEFTWAYS_RESTITUTION_TABLE_ID
      )
    ).toBe(true);
    state = stepThreefoldSimulation(state, { type: 'interact' });
    expect(state.weftways.relayRestitutionNegotiated).toBe(false);

    state = stepThreefoldSimulation(approachPell(state), { type: 'interact' });
    expect(state.weftways.relayRecordRead).toBe(true);
    expect(
      isThreefoldInteractableInReach(
        state,
        THREEFOLD_WEFTWAYS_RESTITUTION_TABLE_ID
      )
    ).toBe(false);
    state = stepThreefoldSimulation(state, { type: 'interact' });
    expect(state.weftways.relayRestitutionNegotiated).toBe(false);

    state = approachRestitutionTable(state);
    const crisis = state.crisis;
    const episode = state.episode;
    state = stepThreefoldSimulation(state, { type: 'interact' });
    const { restitution } = assertNegotiatedRestitutionOutcome({
      state,
      testCase,
      committedChoice,
      floodedGeometryIds,
      crisis,
      episode,
    });
    const restored = assertRestitutionSaveRoundTrip(state, restitution);
    expect(
      stepThreefoldSimulation(restored, { type: 'interact' }).weftways
    ).toEqual(state.weftways);
    expect(
      stepThreefoldSimulation(approachCaravanCircle(state), {
        type: 'interact',
      }).weftways
    ).toEqual(state.weftways);
    expect(
      stepThreefoldSimulation(approachPrivateCache(state), {
        type: 'interact',
      }).weftways
    ).toEqual(state.weftways);
    expect(
      stepThreefoldSimulation(approachBrazier(state), { type: 'interact' })
        .weftways
    ).toEqual(state.weftways);
  });
});

describe('THREEFOLD Weftways persistence and validation', () => {
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

  test('exports both flow outcomes under an isolated route save key', () => {
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

    expect(envelope.schemaVersion).toBe(4);
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
  });

  test('migrates legacy relay responses and defaults restitution to false', () => {
    const state = stepThreefoldSimulation(
      approachFlowControl(
        createWeftwaysRun(),
        THREEFOLD_WEFTWAYS_PELL_BYPASS_ID,
        'left'
      ),
      { type: 'interact' }
    );
    const serialized = serializeThreefoldSimulation(state);
    const legacyRoute = JSON.parse(serialized);
    legacyRoute.schemaVersion = 1;
    legacyRoute.state.weftways.relayRecordRead = true;
    legacyRoute.state.weftways.relayRecordShared = true;
    delete legacyRoute.state.weftways.relayRecordConcealed;
    expect(
      restoreThreefoldSimulation(JSON.stringify(legacyRoute)).weftways
    ).toMatchObject({
      relayRecordRead: true,
      relayRecordShared: true,
      relayRecordConcealed: false,
      relayRecordDestroyed: false,
      relayRestitutionNegotiated: false,
    });
    const previousRoute = JSON.parse(serialized);
    previousRoute.schemaVersion = 2;
    previousRoute.state.weftways.relayRecordRead = true;
    previousRoute.state.weftways.relayRecordConcealed = true;
    delete previousRoute.state.weftways.relayRecordDestroyed;
    expect(
      restoreThreefoldSimulation(JSON.stringify(previousRoute)).weftways
    ).toMatchObject({
      relayRecordConcealed: true,
      relayRecordDestroyed: false,
      relayRestitutionNegotiated: false,
    });
    const thirdRoute = JSON.parse(serialized);
    thirdRoute.schemaVersion = 3;
    thirdRoute.state.weftways.relayRecordRead = true;
    thirdRoute.state.weftways.relayRecordDestroyed = true;
    delete thirdRoute.state.weftways.relayRestitutionNegotiated;
    expect(
      restoreThreefoldSimulation(JSON.stringify(thirdRoute)).weftways
    ).toMatchObject({
      relayRecordRead: true,
      relayRecordDestroyed: true,
      relayRestitutionNegotiated: false,
    });
  });

  test('rejects unsupported and inconsistent Weftways route state', () => {
    const state = createWeftwaysRun();
    const envelope = JSON.parse(serializeThreefoldSimulation(state));
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
        JSON.stringify({ ...envelope, schemaVersion: 5 })
      )
    ).toBeNull();
    expect(
      normalizeThreefoldWeftwaysState({ flowChoice: 'pell-bypass' })
    ).toMatchObject({
      relayRecordRead: false,
      relayRecordShared: false,
      relayRecordConcealed: false,
      relayRecordDestroyed: false,
      relayRestitutionNegotiated: false,
    });
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
        relayRecordShared: true,
      })
    ).toThrow('Weftways relay disclosure requires the record.');
    expect(() =>
      normalizeThreefoldWeftwaysState({
        flowChoice: 'pell-bypass',
        relayRecordShared: 'yes',
      })
    ).toThrow('Weftways relay disclosure state is invalid.');
  });

  test('rejects invalid and conflicting private relay decisions', () => {
    expect(() =>
      normalizeThreefoldWeftwaysState({
        flowChoice: 'pell-bypass',
        relayRecordConcealed: 'yes',
      })
    ).toThrow('Weftways relay privacy state is invalid.');
    expect(() =>
      normalizeThreefoldWeftwaysState({
        flowChoice: 'pell-bypass',
        relayRecordConcealed: true,
      })
    ).toThrow('Weftways privacy choice requires the record.');
    expect(() =>
      normalizeThreefoldWeftwaysState({
        flowChoice: 'pell-bypass',
        relayRecordRead: true,
        relayRecordShared: true,
        relayRecordConcealed: true,
      })
    ).toThrow('Weftways relay choices conflict.');
  });

  test('rejects invalid, pre-discovery, and conflicting destruction choices', () => {
    expect(() =>
      normalizeThreefoldWeftwaysState({
        flowChoice: 'pell-bypass',
        relayRecordDestroyed: 'yes',
      })
    ).toThrow('Weftways relay destruction state is invalid.');
    expect(() =>
      normalizeThreefoldWeftwaysState({
        flowChoice: 'pell-bypass',
        relayRecordDestroyed: true,
      })
    ).toThrow('Weftways destruction choice requires the record.');
    expect(() =>
      normalizeThreefoldWeftwaysState({
        flowChoice: 'pell-bypass',
        relayRecordRead: true,
        relayRecordDestroyed: true,
        relayRecordConcealed: true,
      })
    ).toThrow('Weftways relay choices conflict.');
  });

  test('rejects invalid, pre-discovery, and conflicting restitution choices', () => {
    expect(() =>
      normalizeThreefoldWeftwaysState({
        flowChoice: 'pell-bypass',
        relayRestitutionNegotiated: 'yes',
      })
    ).toThrow('Weftways restitution negotiation state is invalid.');
    expect(() =>
      normalizeThreefoldWeftwaysState({
        flowChoice: 'pell-bypass',
        relayRestitutionNegotiated: true,
      })
    ).toThrow('Weftways restitution requires the record.');
    expect(() =>
      normalizeThreefoldWeftwaysState({
        flowChoice: 'pell-bypass',
        relayRecordRead: true,
        relayRestitutionNegotiated: true,
        relayRecordDestroyed: true,
      })
    ).toThrow('Weftways relay choices conflict.');
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
