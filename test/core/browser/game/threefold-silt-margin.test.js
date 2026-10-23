import {
  createThreefoldSiltMarginScene,
  normalizeThreefoldSiltMarginState,
  THREEFOLD_SILT_MARGIN_FINE_VALVE_ID,
} from '../../../../src/core/browser/game/threefold/silt-margin.js';
import {
  createThreefoldSiltMarginWaterPuzzle,
  operateThreefoldSiltMarginValve,
} from '../../../../src/core/browser/game/threefold/silt-margin-water.js';
import { createThreefoldSluiceScene } from '../../../../src/core/browser/game/threefold/sluice-scene.js';
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

const CRISIS_THRESHOLDS = {
  urgentAtMinutes: 4,
  surgeAtMinutes: 9,
  aftermathAtMinutes: 15,
};

/**
 *
 */
/**
 * Create a fresh Silt Margin simulation for regression coverage.
 * @returns {ReturnType<typeof createThreefoldSimulation>} Test simulation.
 */
function createSiltMarginRun() {
  return createThreefoldSimulation(
    CRISIS_THRESHOLDS,
    createThreefoldSiltMarginScene()
  );
}

/**
 * Follow the safe crossing to the point where Neme can answer the Choir signal.
 * @returns {ReturnType<typeof createThreefoldSimulation>} Signal sent in reach.
 */
function sendSiltMarginChoirSignal() {
  let state = createSiltMarginRun();
  state = stepThreefoldSimulation(state, { type: 'interact' });
  state = stepThreefoldSimulation(state, { type: 'interact' });
  state = stepThreefoldSimulation(state, {
    type: 'wait',
    elapsedGameMinutes: 1,
  });
  for (let step = 0; step < 46; step += 1)
    state = stepThreefoldSimulation(state, {
      type: 'move',
      direction: 'right',
    });
  return stepThreefoldSimulation(state, { type: 'interact' });
}

describe('THREEFOLD Silt Margin crossing', () => {
  test('starts at the authored physical scale and renders a shared snapped frame', () => {
    const state = createSiltMarginRun();
    const position = { ...state.player.position };
    const frame = renderThreefoldFrame(state);

    expect(state.scene.id).toBe('silt-margin');
    expect(state.player.scale).toBe(-4);
    expect(frame.threefold.heightMeters * 100).toBeCloseTo(2.26, 2);
    expect(frame.presentation.status).toBe('SCALE -4 · 2.26 cm · A 8/8');
    expect(frame.quest).toBe('The Silt Margin');
    expect(frame.threefold).toMatchObject({
      guardian: 'present',
      signal: 'blocked',
      rootArchBroken: false,
      siltMarginWater: {
        upstreamSurfaceElevationMeters: 0.04,
        downstreamSurfaceElevationMeters: 0,
        valveOpen: false,
        crossingAvailable: false,
      },
      growthPreviewGeometryIds: ['silt-margin-root-arch'],
      growthPreviewCreatureIds: ['silt-margin-guardian'],
    });
    expect(
      frame.shapes.every(shape => shape.x % 8 === 0 && shape.y % 8 === 0)
    ).toBe(true);
    expect(
      frame.shapes
        .filter(shape => shape.type === 'rect')
        .every(shape => shape.width % 8 === 0 && shape.height % 8 === 0)
    ).toBe(true);
    expect(state.player.position).toEqual(position);

    const moved = stepThreefoldSimulation(state, {
      type: 'move',
      direction: 'right',
    });
    expect(moved.player.position.x).toBeGreaterThan(position.x);
    expect(moved.player.position.x).toBeCloseTo(0.13050864197530865, 12);
    expect(moved.player.position.x).not.toBe(0.131);
    renderThreefoldFrame(moved);
    expect(moved.player.position.x).not.toBe(position.x);
  });

  test('guides the guardian aside and sends the signal after reaching its root', () => {
    let state = createSiltMarginRun();
    state = stepThreefoldSimulation(state, { type: 'interact' });
    expect(state.siltMargin).toMatchObject({
      guardian: 'guided-aside',
      signal: 'blocked',
      quietingEvidenceHeard: false,
    });
    expect(
      renderThreefoldFrame(state).threefold.growthPreviewCreatureIds
    ).toEqual([]);

    state = stepThreefoldSimulation(state, { type: 'interact' });
    expect(state.siltMargin.waterPuzzle.port.open).toBe(true);
    expect(
      state.siltMargin.waterPuzzle.chambers[0].volumeCubicMeters
    ).toBeLessThan(0.00004);
    state = stepThreefoldSimulation(state, {
      type: 'wait',
      elapsedGameMinutes: 1,
    });
    expect(
      renderThreefoldFrame(state).threefold.siltMarginWater.crossingAvailable
    ).toBe(true);

    for (let step = 0; step < 46; step += 1)
      state = stepThreefoldSimulation(state, {
        type: 'move',
        direction: 'right',
      });
    state = stepThreefoldSimulation(state, { type: 'interact' });

    expect(state.siltMargin).toMatchObject({
      guardian: 'guided-aside',
      signal: 'sent',
      quietingEvidenceHeard: false,
    });
    expect(renderThreefoldFrame(state).threefold.signal).toBe('sent');
    expect(state.encounter.growthDeaths).toBeUndefined();
    expect(state.elapsedGameSeconds).toBe(795);
  });

  test('hears Neme’s trace after the safe signal without Iri’s report', () => {
    let state = sendSiltMarginChoirSignal();
    expect(state.siltMargin.quietingEvidenceHeard).toBe(false);

    for (let step = 0; step < 20; step += 1)
      state = stepThreefoldSimulation(state, {
        type: 'move',
        direction: 'left',
      });
    const outOfReach = stepThreefoldSimulation(state, { type: 'interact' });
    expect(outOfReach.siltMargin.quietingEvidenceHeard).toBe(false);
    expect(outOfReach.siltMargin.signal).toBe('sent');

    state = outOfReach;
    for (let step = 0; step < 20; step += 1)
      state = stepThreefoldSimulation(state, {
        type: 'move',
        direction: 'right',
      });
    const waterBeforeReply = state.siltMargin.waterPuzzle;
    const heard = stepThreefoldSimulation(state, { type: 'interact' });

    expect(heard.siltMargin).toMatchObject({
      guardian: 'guided-aside',
      signal: 'sent',
      quietingEvidenceHeard: true,
    });
    expect(heard.siltMargin.waterPuzzle.port.open).toBe(
      waterBeforeReply.port.open
    );
    expect(
      renderThreefoldFrame(heard).threefold.siltMarginWater.crossingAvailable
    ).toBe(true);
    const frame = renderThreefoldFrame(heard);
    expect(frame.threefold).not.toHaveProperty('iriRecordedConfession');
    expect(frame.threefold.siltMarginQuietingEvidence).toEqual({
      title: 'Neme’s translated Choir trace',
      text: expect.stringContaining('downstream replies stopped'),
    });
    expect(frame.threefold.siltMarginQuietingEvidence.text).toContain(
      'does not identify who sent the final message'
    );
    expect(frame.threefold.siltMarginQuietingEvidence.text).toContain(
      'what Iri knew'
    );
    expect(frame.threefold.siltMarginQuietingEvidence.text).toContain(
      'who was responsible'
    );
    expect(
      frame.shapes.every(shape => shape.x % 8 === 0 && shape.y % 8 === 0)
    ).toBe(true);
    expect(
      frame.shapes
        .filter(shape => shape.type === 'rect')
        .every(shape => shape.width % 8 === 0 && shape.height % 8 === 0)
    ).toBe(true);

    const restored = restoreThreefoldSimulation(
      serializeThreefoldSimulation(heard)
    );
    expect(restored.siltMargin.quietingEvidenceHeard).toBe(true);
    expect(
      renderThreefoldFrame(restored).threefold.siltMarginQuietingEvidence
    ).toEqual(frame.threefold.siltMarginQuietingEvidence);
    const repeated = stepThreefoldSimulation(heard, { type: 'interact' });
    expect(repeated.siltMargin.quietingEvidenceHeard).toBe(true);
    expect(
      renderThreefoldFrame(repeated).threefold.siltMarginQuietingEvidence
    ).toEqual(frame.threefold.siltMarginQuietingEvidence);
  });

  test('a stale Neme actor cannot supply Choir evidence after Neme has died', () => {
    const state = sendSiltMarginChoirSignal();
    state.siltMargin.quietingEvidenceHeard = false;
    state.encounter.growthDeaths = [
      { creatureId: 'silt-margin-neme', cause: 'growth' },
    ];

    const next = stepThreefoldSimulation(state, { type: 'interact' });

    expect(state.scene.creatures.map(({ id }) => id)).toContain(
      'silt-margin-neme'
    );
    expect(next.siltMargin.quietingEvidenceHeard).toBe(false);
    const remembered = {
      ...next,
      siltMargin: { ...next.siltMargin, quietingEvidenceHeard: true },
    };
    expect(
      renderThreefoldFrame(remembered).threefold.siltMarginQuietingEvidence.text
    ).toContain('Neme is no longer here');
  });

  test('blocks the rivulet before diversion and growth breaks the root arch as a second solution', () => {
    let state = createSiltMarginRun();
    for (let step = 0; step < 20; step += 1)
      state = stepThreefoldSimulation(state, {
        type: 'move',
        direction: 'right',
      });
    expect(state.player.position.x).toBeLessThan(0.16);

    let sideRoute = createSiltMarginRun();
    for (let step = 0; step < 30; step += 1)
      sideRoute = stepThreefoldSimulation(sideRoute, {
        type: 'move',
        direction: 'down',
      });
    expect(sideRoute.player.position.y).toBeGreaterThan(0.12);
    for (let step = 0; step < 20; step += 1)
      sideRoute = stepThreefoldSimulation(sideRoute, {
        type: 'move',
        direction: 'right',
      });
    expect(sideRoute.player.position.x).toBeLessThan(0.16);

    state = createSiltMarginRun();
    state = stepThreefoldSimulation(state, { type: 'grow' });

    expect(state.player.scale).toBe(-3);
    expect(state.player.destroyedGeometryIds).toContain(
      'silt-margin-root-arch'
    );
    expect(state.siltMargin).toMatchObject({
      guardian: 'killed',
      signal: 'disrupted',
    });
    expect(state.encounter.growthDeaths).toEqual([
      { creatureId: 'silt-margin-guardian', cause: 'growth' },
    ]);
    expect(
      renderThreefoldFrame(state).threefold.growthPreviewCreatureIds
    ).toEqual([]);
    expect(renderThreefoldFrame(state).threefold.rootArchBroken).toBe(true);
    expect(
      stepThreefoldSimulation(state, { type: 'move', direction: 'right' })
        .player.position.x
    ).toBeGreaterThan(state.player.position.x);
    expect(
      restoreThreefoldSimulation(serializeThreefoldSimulation(state))
    ).toEqual(state);
  });

  test('does not repeat guardian consequences or send a disrupted signal', () => {
    let state = createSiltMarginRun();
    state = stepThreefoldSimulation(state, { type: 'grow' });
    const growthDeaths = state.encounter.growthDeaths;
    state = stepThreefoldSimulation(state, { type: 'grow' });

    expect(state.siltMargin).toMatchObject({
      guardian: 'killed',
      signal: 'disrupted',
    });
    expect(state.encounter.growthDeaths).toEqual(growthDeaths);

    for (let step = 0; step < 46; step += 1)
      state = stepThreefoldSimulation(state, {
        type: 'move',
        direction: 'right',
      });
    const interaction = stepThreefoldSimulation(state, { type: 'interact' });
    expect(interaction.siltMargin.signal).toBe('disrupted');
  });

  test('rejects a saved sent signal while the crossing remains flooded', () => {
    expect(() =>
      normalizeThreefoldSiltMarginState({
        guardian: 'guided-aside',
        signal: 'sent',
        waterPuzzle: createThreefoldSiltMarginWaterPuzzle({
          crossingOpen: false,
        }),
      })
    ).toThrow('The Choir signal cannot be sent across a flooded crossing.');
  });

  test('migrates schema-v1 branches and rejects non-conserved dew saves', () => {
    expect(
      normalizeThreefoldSiltMarginState({
        guardian: 'guided-aside',
        signal: 'blocked',
      })
    ).toMatchObject({
      guardian: 'guided-aside',
      signal: 'blocked',
      quietingEvidenceHeard: false,
    });
    expect(
      normalizeThreefoldSiltMarginState({
        guardian: 'guided-aside',
        signal: 'sent',
      })
    ).toMatchObject({ guardian: 'guided-aside', signal: 'sent' });
    expect(() => normalizeThreefoldSiltMarginState(null)).toThrow(
      'Silt Margin state is invalid.'
    );

    const envelope = JSON.parse(
      serializeThreefoldSimulation(createSiltMarginRun())
    );
    expect(envelope.schemaVersion).toBe(2);
    envelope.schemaVersion = 1;
    delete envelope.state.siltMargin.waterPuzzle;
    const migrated = restoreThreefoldSimulation(JSON.stringify(envelope));
    expect(migrated.siltMargin.waterPuzzle.chambers[0].volumeCubicMeters).toBe(
      0.00004
    );

    const completedLegacy = JSON.parse(
      serializeThreefoldSimulation(createSiltMarginRun())
    );
    completedLegacy.schemaVersion = 1;
    completedLegacy.state.siltMargin.guardian = 'guided-aside';
    completedLegacy.state.siltMargin.signal = 'sent';
    delete completedLegacy.state.siltMargin.quietingEvidenceHeard;
    delete completedLegacy.state.siltMargin.waterPuzzle;
    const restoredSignal = restoreThreefoldSimulation(
      JSON.stringify(completedLegacy)
    );
    expect(restoredSignal.siltMargin.signal).toBe('sent');
    expect(restoredSignal.siltMargin.quietingEvidenceHeard).toBe(false);
    expect(
      renderThreefoldFrame(restoredSignal).threefold.siltMarginWater
        .crossingAvailable
    ).toBe(true);

    const unsupportedVersion = JSON.parse(
      serializeThreefoldSimulation(createSiltMarginRun())
    );
    unsupportedVersion.schemaVersion = 3;
    expect(
      restoreThreefoldSimulation(JSON.stringify(unsupportedVersion))
    ).toBeNull();

    const invalidWater = JSON.parse(
      serializeThreefoldSimulation(createSiltMarginRun())
    );
    invalidWater.state.siltMargin.waterPuzzle.chambers[0].volumeCubicMeters = 0.000039;
    expect(restoreThreefoldSimulation(JSON.stringify(invalidWater))).toBeNull();
  });

  test('advances only supported commands and explicit waits on the region clock', () => {
    const initial = createSiltMarginRun();
    expect(stepThreefoldSimulation(initial, { type: 'unsupported' })).toBe(
      initial
    );
    expect(stepThreefoldSimulation(initial, { type: 'wait' })).toBe(initial);

    const attemptedShrink = stepThreefoldSimulation(initial, {
      type: 'shrink',
    });
    expect(attemptedShrink.player.scale).toBe(-4);
    expect(attemptedShrink.elapsedGameSeconds).toBe(15);
    const waited = stepThreefoldSimulation(attemptedShrink, {
      type: 'wait',
      elapsedGameMinutes: 0.5,
    });
    expect(waited.elapsedGameSeconds).toBe(45);
    expect(waited.crisis.elapsedMinutes).toBe(0);
  });

  test.each([1, 2])(
    'rejects contradictory guardian deaths in schema %s',
    schemaVersion => {
      const initial = JSON.parse(
        serializeThreefoldSimulation(createSiltMarginRun())
      );
      initial.schemaVersion = schemaVersion;
      for (const guardian of ['present', 'guided-aside']) {
        const envelope = structuredClone(initial);
        envelope.state.siltMargin.guardian = guardian;
        envelope.state.encounter.growthDeaths = [
          { creatureId: 'silt-margin-guardian', cause: 'growth' },
        ];
        expect(restoreThreefoldSimulation(JSON.stringify(envelope))).toBeNull();
      }
      for (const deaths of [
        undefined,
        [],
        [{ creatureId: 'unrelated-creature', cause: 'growth' }],
      ]) {
        const envelope = structuredClone(initial);
        envelope.state.siltMargin.guardian = 'killed';
        envelope.state.siltMargin.signal = 'disrupted';
        envelope.state.encounter.growthDeaths = deaths;
        expect(restoreThreefoldSimulation(JSON.stringify(envelope))).toBeNull();
      }
    }
  );

  test.each([1, 2])(
    'keeps genuine guardian outcomes readable in schema %s',
    schemaVersion => {
      for (const [guardian, signal] of [
        ['present', 'blocked'],
        ['guided-aside', 'blocked'],
        ['guided-aside', 'sent'],
        ['killed', 'disrupted'],
      ]) {
        const envelope = JSON.parse(
          serializeThreefoldSimulation(createSiltMarginRun())
        );
        envelope.schemaVersion = schemaVersion;
        envelope.state.siltMargin = {
          guardian,
          signal,
          quietingEvidenceHeard: false,
          waterPuzzle: createThreefoldSiltMarginWaterPuzzle({
            crossingOpen: signal === 'sent',
          }),
        };
        if (schemaVersion === 1) delete envelope.state.siltMargin.waterPuzzle;
        if (guardian === 'killed')
          envelope.state.encounter.growthDeaths = [
            { creatureId: 'silt-margin-guardian', cause: 'growth' },
          ];
        const restored = restoreThreefoldSimulation(JSON.stringify(envelope));
        expect(restored).not.toBeNull();
        expect(restored.siltMargin).toMatchObject({ guardian, signal });
        expect(
          (restored.encounter.growthDeaths || []).some(
            death => death.creatureId === 'silt-margin-guardian'
          )
        ).toBe(guardian === 'killed');
      }
    }
  );

  test('rejects impossible saved branch combinations', () => {
    const envelope = JSON.parse(
      serializeThreefoldSimulation(createSiltMarginRun())
    );
    envelope.state.siltMargin = { guardian: 'killed', signal: 'sent' };
    expect(restoreThreefoldSimulation(JSON.stringify(envelope))).toBeNull();

    const prematureEvidence = JSON.parse(
      serializeThreefoldSimulation(createSiltMarginRun())
    );
    prematureEvidence.state.siltMargin.quietingEvidenceHeard = true;
    expect(
      restoreThreefoldSimulation(JSON.stringify(prematureEvidence))
    ).toBeNull();

    const invalidEvidenceFlag = JSON.parse(
      serializeThreefoldSimulation(createSiltMarginRun())
    );
    invalidEvidenceFlag.state.siltMargin.quietingEvidenceHeard = 'yes';
    expect(
      restoreThreefoldSimulation(JSON.stringify(invalidEvidenceFlag))
    ).toBeNull();

    const missingEncounter = JSON.parse(
      serializeThreefoldSimulation(createSiltMarginRun())
    );
    delete missingEncounter.state.encounter;
    expect(
      restoreThreefoldSimulation(JSON.stringify(missingEncounter))
    ).toBeNull();

    const invalidElapsed = JSON.parse(
      serializeThreefoldSimulation(createSiltMarginRun())
    );
    invalidElapsed.state.elapsedGameSeconds = -1;
    expect(
      restoreThreefoldSimulation(JSON.stringify(invalidElapsed))
    ).toBeNull();
  });

  test('isolates Silt Margin saves from the gate and Archive saves', () => {
    const values = new Map();
    const storage = {
      getItem: key => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
      removeItem: key => values.delete(key),
    };
    const gateStore = createThreefoldSimulationSaveStore(
      storage,
      'broken-gate'
    );
    const archiveStore = createThreefoldSimulationSaveStore(
      storage,
      'small-world-sluice'
    );
    const siltStore = createThreefoldSimulationSaveStore(
      storage,
      'silt-margin'
    );

    gateStore.save(createThreefoldSimulation(CRISIS_THRESHOLDS));
    archiveStore.save(
      createThreefoldSimulation(CRISIS_THRESHOLDS, createThreefoldSluiceScene())
    );
    siltStore.save(createSiltMarginRun());

    expect(values.size).toBe(1);
    expect(gateStore.load().scene.id).toBe('broken-gate');
    expect(archiveStore.load().scene.id).toBe('small-world-sluice');
    expect(siltStore.load().scene.id).toBe('silt-margin');
  });
});

describe('THREEFOLD Silt Margin authored valve scale', () => {
  test('uses the authored scale for the actual fine-valve interaction', () => {
    const scene = createThreefoldSiltMarginScene();
    const fineValve = scene.interactables.find(
      ({ id }) => id === THREEFOLD_SILT_MARGIN_FINE_VALVE_ID
    );
    expect(fineValve?.interactionScale).toBe(-4);
    if (!fineValve) throw new Error('The authored fine valve is required.');
    fineValve.interactionScale = -3;
    const initial = createThreefoldSimulation(CRISIS_THRESHOLDS, scene);
    const guided = stepThreefoldSimulation(initial, { type: 'interact' });
    expect(guided.siltMargin.guardian).toBe('guided-aside');

    const wrongScale = stepThreefoldSimulation(guided, { type: 'interact' });
    expect(wrongScale.siltMargin.waterPuzzle.port.open).toBe(false);

    const atAuthoredScale = {
      ...wrongScale,
      player: { ...wrongScale.player, scale: -3 },
    };
    const opened = stepThreefoldSimulation(atAuthoredScale, {
      type: 'interact',
    });
    expect(opened.siltMargin.waterPuzzle.port.open).toBe(true);
    expect(
      opened.siltMargin.waterPuzzle.chambers[0].volumeCubicMeters
    ).toBeLessThan(0.00004);
    expect(opened.elapsedGameSeconds).toBe(45);
  });

  test('preserves the fine valve default scale', () => {
    const opened = operateThreefoldSiltMarginValve()(
      createThreefoldSiltMarginWaterPuzzle(),
      -4
    );

    expect(opened.port.open).toBe(true);
  });
});

describe('THREEFOLD Silt Margin logical-grid renderer', () => {
  test.each([-4, -3])(
    'projects scene identities and derives static sprites from cells at scale %s',
    scale => {
      const state = createSiltMarginRun();
      state.player.scale = scale;
      const before = structuredClone(state);
      const frame = renderThreefoldFrame(state);
      const layout = frame.threefold.logicalGridLayout;
      const entities = new Map(
        layout.entities.map(entity => [entity.id, entity])
      );

      expect(layout.entities.map(entity => entity.id)).toEqual(
        [...entities.keys()].sort()
      );
      expect(layout.hierarchy.visibleEntityIds).toEqual(
        [...entities.keys()].sort()
      );
      expect(layout.overflow).toEqual([]);
      expect(layout.conflicts).toEqual([]);
      expect(
        layout.entities.every(({ placement }) => placement === 'placed')
      ).toBe(true);
      expect(entities.get('silt-margin-guardian')).toMatchObject({
        logicalGridKinds: ['creature', 'interactable'],
      });
      expect(entities.get('mara').logicalGridKinds).toEqual(['actor']);
      expect(entities.get('silt-margin-water').logicalGridKinds).toEqual([
        'fluid',
      ]);
      expect(entities.get('silt-margin-root-arch').cellBounds).toEqual(
        expect.objectContaining({
          width: expect.any(Number),
          height: expect.any(Number),
        })
      );
      for (const id of [
        'silt-margin-root-arch',
        'silt-margin-guardian',
        'silt-margin-fine-valve',
        'silt-margin-signal-root',
        'mara',
      ]) {
        const entity = entities.get(id);
        const shape = frame.shapes.find(item => item.geometryId === id);
        expect(shape).toMatchObject({ logicalCellBounds: entity.cellBounds });
        expect(shape.x % 8).toBe(0);
        expect(shape.y % 8).toBe(0);
        expect(shape.width % 8).toBe(0);
        expect(shape.height % 8).toBe(0);
        const cellSize = 1.8288 * 3 ** scale;
        const pitchX = (144 / 0.32) * cellSize;
        const pitchY = (72 / 0.18) * cellSize;
        const expectedScreenY =
          Math.round(
            (100 - (entity.cellBounds.y + entity.cellBounds.height) * pitchY) /
              8
          ) * 8;
        expect(shape.x).toBe(
          Math.round((8 + entity.cellBounds.x * pitchX) / 8) * 8
        );
        expect(shape.y).toBe(expectedScreenY);
      }
      expect(state).toEqual(before);
      expect(
        frame.threefold.siltMarginWater.upstreamSurfaceElevationMeters
      ).toBe(0.04);
      expect(
        frame.shapes.find(
          item => item.geometryId === undefined && item.fill === '#25a9b8'
        )
      ).toMatchObject({ x: 88, y: 72, width: 24, height: 16 });
      const permuted = {
        ...state,
        scene: {
          ...state.scene,
          geometry: [...state.scene.geometry].reverse(),
          decorations: [...state.scene.decorations].reverse(),
          interactables: [...state.scene.interactables].reverse(),
          creatures: [...state.scene.creatures].reverse(),
        },
      };
      expect(
        renderThreefoldFrame(permuted).threefold.logicalGridLayout
      ).toEqual(layout);
    }
  );

  test('rejects non-identical facets that reuse a stable ID', () => {
    const state = createSiltMarginRun();
    state.scene.creatures[0].bounds.min.x += 0.001;

    expect(() => renderThreefoldFrame(state)).toThrow(
      'Conflicting Silt Margin geometry for silt-margin-guardian.'
    );
  });

  test('reports a missing required static render identity', () => {
    const state = createSiltMarginRun();
    state.scene.decorations = state.scene.decorations.filter(
      ({ id }) => id !== 'silt-margin-signal-root'
    );

    expect(() => renderThreefoldFrame(state)).toThrow(
      'Silt Margin render entity is missing.'
    );
  });

  test('reports out-of-region decorations without mutating the Silt Margin scene', () => {
    const state = createSiltMarginRun();
    state.scene.decorations = state.scene.decorations.map(object =>
      object.id === 'silt-margin-dew-pool'
        ? {
            ...object,
            bounds: {
              min: { ...object.bounds.min, x: 0.5 },
              max: { ...object.bounds.max, x: 0.6 },
            },
          }
        : object
    );
    const before = structuredClone(state);

    const frame = renderThreefoldFrame(state);
    const outOfRegion = frame.threefold.logicalGridLayout.entities.find(
      entity => entity.id === 'silt-margin-dew-pool'
    );

    expect(frame.threefold.logicalGridLayout.overflow).toContainEqual({
      entityId: 'silt-margin-dew-pool',
      cellBounds: outOfRegion.cellBounds,
    });
    expect(outOfRegion.placement).toBe('overflow');
    expect(state).toEqual(before);
  });
});
