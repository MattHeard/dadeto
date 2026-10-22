import { jest } from '@jest/globals';
import { createThreefoldRuntime } from '../../../../src/core/browser/game/threefold/runtime.js';
import { createThreefoldBelltopsScene } from '../../../../src/core/browser/game/threefold/belltops.js';
import { createThreefoldCrownbackReachScene } from '../../../../src/core/browser/game/threefold/crownback-reach.js';
import { createThreefoldHearthgapsScene } from '../../../../src/core/browser/game/threefold/hearthgaps.js';
import { createThreefoldSiltMarginScene } from '../../../../src/core/browser/game/threefold/silt-margin.js';
import { createThreefoldSiltMarginWaterPuzzle } from '../../../../src/core/browser/game/threefold/silt-margin-water.js';
import { createThreefoldWeftwaysScene } from '../../../../src/core/browser/game/threefold/weftways.js';
import { createThreefoldGrainlandsScene } from '../../../../src/core/browser/game/threefold/grainlands.js';
import { createThreefoldSluiceScene } from '../../../../src/core/browser/game/threefold/sluice-scene.js';
import { createThreefoldWakeformShoalsScene } from '../../../../src/core/browser/game/threefold/wakeform-shoals.js';
import { createThreefoldPressureNetwork } from '../../../../src/core/browser/game/threefold/pressure-network.js';
import { createThreefoldPressureNetworkSaveStore } from '../../../../src/core/browser/game/threefold/save.js';
import { THREEFOLD_SHARED_SAVE_KEYS } from '../../../../src/core/browser/game/threefold/campaign-storage.js';
import { restoreThreefoldCampaignOutcomes } from '../../../../src/core/browser/game/threefold/campaign-outcomes.js';
import {
  createThreefoldReturnTide,
  getThreefoldReturnTidePhase,
} from '../../../../src/core/browser/game/threefold/return-tide.js';
import { getThreefoldReturnTideFacts } from '../../../../src/core/browser/game/threefold/return-tide-facts.js';
import { projectThreefoldReturnTide } from '../../../../src/core/browser/game/threefold/return-tide-projection.js';
import { attachThreefoldReturnTideScene } from '../../../../src/core/browser/game/threefold/return-tide-world.js';
import {
  applyThreefoldReturnTideInteraction,
  getThreefoldReturnTideInteraction,
} from '../../../../src/core/browser/game/threefold/return-tide-interactions.js';

/** @returns {any} One instrumented shared browser storage boundary. */
function browserStorage() {
  const records = new Map();
  return {
    getItem: key => records.get(key) ?? null,
    setItem: jest.fn((key, value) => records.set(key, value)),
  };
}

/**
 * Inspect actual outcomes through the portable save, not public character knowledge.
 * @param {any} runtime Owning controller.
 * @returns {any} Actual persistent physical finale state.
 */
function actualTide(runtime) {
  const backup = JSON.parse(runtime.exportCampaign());
  return restoreThreefoldCampaignOutcomes(
    backup.records[THREEFOLD_SHARED_SAVE_KEYS.outcomes]
  ).returnTide;
}

/**
 * Position a canonical controller fixture at an authored reachable physical target.
 * @param {any} runtime Real controller with actual interaction dispatch.
 * @param {string} id Authored spatial target.
 * @returns {void} Only position is arranged; controls use real dispatch.
 */
function approach(runtime, id) {
  const state = runtime.getState();
  const target = state.scene.interactables.find(item => item.id === id);
  expect(target).toBeDefined();
  state.player.position = { ...target.position };
}

/**
 * Save one authentic regional prerequisite for later physically reached actions.
 * @param {any} storage Shared campaign storage.
 * @param {any} scene Canonical scene constructor result.
 * @param {(state:any)=>void} prepare One route outcome already earned in prior play.
 * @returns {void} A persisted route, never a hidden finale flag.
 */
function prepareRegion(storage, scene, prepare) {
  const runtime = createThreefoldRuntime({ storage, scene });
  prepare(runtime.getState());
  runtime.save();
}

/** @param {any} storage Shared campaign storage. @returns {void} Prepared physical routes. */
function prepareSharedRegulatorRoutes(storage) {
  prepareRegion(storage, undefined, state => {
    state.episode.passengers = 'partial';
  });
  prepareRegion(storage, createThreefoldSluiceScene(), state => {
    state.archiveTraceHeard = true;
  });
  prepareRegion(storage, createThreefoldHearthgapsScene(), state => {
    state.hearthgaps = {
      runoffChoice: 'brin-diversion',
      floodedHomeIds: ['hearthgaps-downstream-homes'],
    };
  });
  prepareRegion(storage, createThreefoldWeftwaysScene(), state => {
    state.weftways.flowChoice = 'pell-bypass';
    state.weftways.floodedGeometryIds = ['weftways-low-quay-homes'];
    state.weftways.relayRecordRead = true;
  });
  prepareRegion(storage, createThreefoldGrainlandsScene(), state => {
    state.grainlands.spiderFate = 'baited-away';
  });
  prepareRegion(storage, createThreefoldSiltMarginScene(), state => {
    state.siltMargin.guardian = 'guided-aside';
    state.siltMargin.signal = 'sent';
    state.siltMargin.quietingEvidenceHeard = true;
    state.siltMargin.waterPuzzle = createThreefoldSiltMarginWaterPuzzle({
      crossingOpen: true,
    });
  });
  prepareRegion(storage, createThreefoldCrownbackReachScene(), state => {
    state.crownbackReach.tharnMet = true;
  });
  prepareRegion(storage, createThreefoldWakeformShoalsScene(), state => {
    state.wakeformShoals.wakeformDiverted = true;
  });
  createThreefoldPressureNetworkSaveStore(storage).save({
    ...createThreefoldPressureNetwork(),
    bypassOpen: true,
  });
}

/**
 * Reach a contextual E target and send it through the real controller transaction.
 * @param {any} runtime Current regional controller.
 * @param {string} id Authored interaction identity.
 * @returns {void} A saved local effect.
 */
function interactWith(runtime, id) {
  approach(runtime, id);
  expect(runtime.frame().threefold.returnTide.interaction.id).toBe(id);
  runtime.dispatch('interact');
}

/**
 * Advance only explicit player waiting, never browser or wall time.
 * @param {any} runtime Real controller.
 * @returns {void} The unavoidable tide reaches its authored aftermath.
 */
function waitForAftermath(runtime) {
  for (let index = 0; index < 6; index += 1)
    runtime.dispatch({ type: 'wait', elapsedGameMinutes: 15 });
}

describe('THREEFOLD Return Tide through campaign controllers', () => {
  test('derives finale requirements from prior regional routes, physical damage and surviving people', () => {
    const runs = {
      'broken-gate': {
        episode: {
          passengers: 'partial',
          latchfolk: 'warned',
          gateRepairedBeforeSurge: false,
        },
        encounter: { growthDeaths: [] },
        player: { destroyedGeometryIds: [] },
      },
      'small-world-sluice': {
        archiveTraceHeard: true,
        encounter: { growthDeaths: [] },
        player: { destroyedGeometryIds: [] },
      },
      hearthgaps: {
        hearthgaps: { runoffChoice: 'brin-diversion' },
        encounter: { growthDeaths: [] },
        player: { destroyedGeometryIds: [] },
      },
      weftways: {
        weftways: { relayRecordRead: true, flowChoice: 'pell-bypass' },
        encounter: { growthDeaths: [] },
        player: { destroyedGeometryIds: [] },
      },
      grainlands: {
        grainlands: { spiderFate: 'baited-away' },
        encounter: { growthDeaths: [] },
        player: { destroyedGeometryIds: [] },
      },
      'silt-margin': {
        siltMargin: {
          guardian: 'guided-aside',
          signal: 'sent',
          quietingEvidenceHeard: true,
        },
        encounter: { growthDeaths: [] },
        player: { destroyedGeometryIds: [] },
      },
      'crownback-reach': {
        crownbackReach: { tharnMet: true },
        encounter: { growthDeaths: [] },
        player: {
          destroyedGeometryIds: ['return-tide-coast-manifold'],
        },
      },
      'wakeform-shoals': {
        wakeformShoals: { wakeformDiverted: true },
        encounter: { growthDeaths: [] },
        player: { destroyedGeometryIds: [] },
      },
    };
    const tide = {
      ...createThreefoldReturnTide(),
      rememberedGrowthDeaths: ['tov'],
      deathIds: [],
      displacedGroups: [],
      damageIds: ['quay-hospital'],
      agreements: ['assembly'],
    };
    const network = {
      ...createThreefoldPressureNetwork(),
      bypassOpen: true,
      hatchClosed: true,
    };

    const facts = getThreefoldReturnTideFacts(runs, tide, network, {
      outcome: 'rescued',
    });

    expect(facts).toMatchObject({
      engineerAvailable: true,
      evidenceCount: 3,
      rootRelief: true,
      coastReady: true,
      priorDeathIds: expect.arrayContaining(['tov']),
      preparedGroups: expect.arrayContaining([
        'assembly',
        'crownback',
        'latchfolk',
        'nursery',
        'threadbound',
        'choir',
      ]),
    });
    expect(facts.intactMechanisms).not.toContain('coast-manifold');
    expect(facts.availableFactions).toEqual(
      expect.arrayContaining([
        'assembly',
        'latchfolk',
        'threadbound',
        'nursery',
        'choir',
        'crownback',
      ])
    );
  });

  test('an affordance without an operation, agreement or survey remains inert', () => {
    const tide = createThreefoldReturnTide();
    const applied = applyThreefoldReturnTideInteraction(
      tide,
      { id: 'return-tide-noop', label: 'NO ACTION', detail: 'No action.' },
      {
        facts: getThreefoldReturnTideFacts(
          {},
          tide,
          createThreefoldPressureNetwork()
        ),
        sceneId: 'belltops',
      }
    );

    expect(applied.tide).toBe(tide);
    expect(applied.notice).toContain('Cannot complete this operation yet.');
  });

  test('leaves unavailable evidence, preparations, mechanisms and engineering unavailable', () => {
    const facts = getThreefoldReturnTideFacts(
      {},
      createThreefoldReturnTide(),
      createThreefoldPressureNetwork()
    );

    expect(facts).toMatchObject({
      intactMechanisms: expect.arrayContaining([
        'seal',
        'spillway',
        'human-manifold',
        'root-manifold',
        'coast-manifold',
      ]),
      availableFactions: ['assembly'],
      engineerAvailable: false,
      evidenceCount: 0,
      rootRelief: false,
      coastReady: false,
      preparedGroups: [],
      priorDeathIds: [],
    });
  });

  test('projects remembered broken hardware and omits residents without a physical actor position', () => {
    const runtime = createThreefoldRuntime({
      storage: browserStorage(),
      scene: createThreefoldBelltopsScene(),
    });
    const projected = projectThreefoldReturnTide(runtime.getState(), {
      ...createThreefoldReturnTide(),
      brokenMechanisms: ['seal'],
    });
    const scene = attachThreefoldReturnTideScene({
      id: 'silt-margin',
      geometry: [],
      creatures: [{ id: 'silt-margin-neme', bounds: {} }],
      interactables: [],
    });

    expect(projected.player.destroyedGeometryIds).toContain('return-tide-seal');
    expect(
      scene.interactables.some(item => item.id === 'return-tide-accord-choir')
    ).toBe(false);
  });

  test('accepts repaired or Iri-rescued engineering support and respects hospital damage', () => {
    const tide = createThreefoldReturnTide();
    const network = createThreefoldPressureNetwork();
    const repaired = getThreefoldReturnTideFacts(
      {
        'broken-gate': {
          episode: { passengers: 'none', gateRepairedBeforeSurge: true },
        },
      },
      tide,
      network
    );
    const iriRescued = getThreefoldReturnTideFacts(
      {
        'broken-gate': {
          episode: { passengers: 'none', gateRepairedBeforeSurge: false },
        },
      },
      tide,
      network,
      { outcome: 'rescued' }
    );
    const hospitalUnavailable = getThreefoldReturnTideFacts(
      {
        'broken-gate': {
          episode: { passengers: 'none', gateRepairedBeforeSurge: false },
        },
      },
      { ...tide, damageIds: ['quay-hospital'] },
      network
    );

    expect(repaired.engineerAvailable).toBe(true);
    expect(iriRescued.engineerAvailable).toBe(true);
    expect(hospitalUnavailable.engineerAvailable).toBe(false);
  });

  test('open spillway is only available after the real Crownback and Wakeform routes', () => {
    const storage = browserStorage();
    prepareSharedRegulatorRoutes(storage);
    const runtime = createThreefoldRuntime({
      storage,
      scene: createThreefoldWakeformShoalsScene({ wakeformDiverted: true }),
    });
    interactWith(runtime, 'return-tide-spillway-control');
    expect(actualTide(runtime).controls.spillwayOpen).toBe(true);
    expect(runtime.frame().threefold.returnTide.notice).toContain(
      'flooding the Quay'
    );
  });

  test('hides unknown and previously destroyed mechanisms from reachable choices', () => {
    const runtime = createThreefoldRuntime({
      scene: createThreefoldBelltopsScene(),
    });
    const state = runtime.getState();
    const position = { ...state.player.position };
    const seal = state.scene.interactables.find(item =>
      item.id.includes('seal-control')
    );
    state.scene.interactables = [
      {
        id: 'return-tide-unknown-control',
        position,
        bounds: {
          min: { x: position.x - 1, y: position.y - 1, z: 0 },
          max: { x: position.x + 1, y: position.y + 1, z: 1 },
        },
      },
    ];
    const tide = createThreefoldReturnTide();
    const facts = getThreefoldReturnTideFacts(
      {},
      tide,
      createThreefoldPressureNetwork()
    );
    expect(getThreefoldReturnTideInteraction(state, tide, facts)).toBeNull();

    state.player.position = { ...seal.position };
    state.scene.interactables = [seal];
    expect(
      getThreefoldReturnTideInteraction(state, tide, {
        ...facts,
        intactMechanisms: [],
      })
    ).toBeNull();
  });

  test('all four local agreements and three working manifolds bind the earned Foldglass control', () => {
    const storage = browserStorage();
    prepareSharedRegulatorRoutes(storage);
    let runtime = createThreefoldRuntime({
      storage,
      scene: createThreefoldBelltopsScene(),
    });
    interactWith(runtime, 'return-tide-accord-assembly');
    interactWith(runtime, 'return-tide-human-manifold-control');
    runtime = createThreefoldRuntime({
      storage,
      scene: createThreefoldSiltMarginScene(),
    });
    interactWith(runtime, 'return-tide-accord-choir');
    interactWith(runtime, 'return-tide-root-manifold-control');
    runtime = createThreefoldRuntime({
      storage,
      scene: createThreefoldHearthgapsScene(),
    });
    interactWith(runtime, 'return-tide-accord-latchfolk');
    runtime = createThreefoldRuntime({
      storage,
      scene: createThreefoldCrownbackReachScene(),
    });
    interactWith(runtime, 'return-tide-accord-crownback');
    interactWith(runtime, 'return-tide-coast-manifold-control');
    runtime = createThreefoldRuntime({
      storage,
      scene: createThreefoldBelltopsScene(),
    });
    interactWith(runtime, 'return-tide-foldglass-control');
    expect(actualTide(runtime).controls).toMatchObject({
      humanManifold: true,
      rootManifold: true,
      coastManifold: true,
      foldglassBound: true,
    });
    expect(actualTide(runtime).agreements).toEqual([
      'assembly',
      'choir',
      'crownback',
      'latchfolk',
    ]);
    expect(getThreefoldReturnTidePhase(actualTide(runtime))).toBe('warning');
    const state = runtime.getState();
    const foldglass = state.scene.interactables.find(
      item => item.id === 'return-tide-foldglass-control'
    );
    state.scene.interactables = [foldglass];
    state.player.position = { ...foldglass.position };
    expect(runtime.frame().threefold.returnTide.interaction).toBeNull();
  });

  test('a reachable E closes the physical seal once per press and preserves its irreversible root cut', () => {
    const storage = browserStorage();
    const runtime = createThreefoldRuntime({
      storage,
      scene: createThreefoldBelltopsScene(),
    });
    approach(runtime, 'return-tide-seal-control');
    expect(runtime.frame().threefold.returnTide.interaction.label).toBe(
      'E CLOSE CITY SEAL'
    );
    runtime.resume();
    runtime.step(125, ['interact']);
    expect(actualTide(runtime).controls.sealClosed).toBe(true);
    expect(actualTide(runtime).damageIds).toContain('choir-branches');
    runtime.step(125, ['interact']);
    expect(actualTide(runtime).controls.sealClosed).toBe(true);
    runtime.step(125, []);
    runtime.step(125, ['interact']);
    expect(actualTide(runtime).controls.sealClosed).toBe(false);
    expect(actualTide(runtime).damageIds).toContain('choir-branches');
    expect(runtime.getSnapshot().campaign.clock.elapsedGameSeconds).toBe(30);
    expect(runtime.frame().toast).toContain('Reopening cannot restore');
  });

  test('blocked construction reports actual prerequisites without consuming hardware or applying another E action', () => {
    const runtime = createThreefoldRuntime({
      scene: createThreefoldBelltopsScene(),
    });
    approach(runtime, 'return-tide-human-manifold-control');
    const iri = runtime.getSnapshot().campaign.iriFate;
    runtime.dispatch('interact');
    expect(actualTide(runtime).controls.humanManifold).toBe(false);
    expect(runtime.getSnapshot().campaign.iriFate).toEqual(iri);
    expect(runtime.frame().toast).toContain(
      'Cannot complete this operation yet.'
    );
    expect(runtime.frame().threefold.returnTide.text).toContain(
      'real engineering'
    );
    expect(runtime.getSnapshot().campaign.clock.elapsedGameSeconds).toBe(15);
  });

  test('refusal reaches a real aftermath; E surveys only the current place and complete backups preserve it', () => {
    const storage = browserStorage();
    const runtime = createThreefoldRuntime({
      storage,
      scene: createThreefoldBelltopsScene(),
    });
    waitForAftermath(runtime);
    expect(runtime.frame().threefold.returnTide).toMatchObject({
      phase: 'aftermath',
      finished: true,
      epilogue: [],
    });
    expect(actualTide(runtime).damageIds).toContain('quay-hospital');
    expect(actualTide(runtime).deathIds).toContain('sera');
    expect(
      runtime
        .getState()
        .scene.creatures.some(person => person.id === 'belltops-sera')
    ).toBe(false);
    expect(runtime.getState().player.destroyedGeometryIds).toContain(
      'return-tide-hospital'
    );
    runtime.dispatch('interact');
    const content = runtime.frame().threefold.returnTide;
    expect(content.epilogue).toContain(
      'sera: died in the Return Tide; no later repair restores this person.'
    );
    expect(content.epilogue.some(row => row.startsWith('iru:'))).toBe(false);
    const backup = runtime.exportCampaign();
    const restored = createThreefoldRuntime({
      storage: browserStorage(),
      scene: createThreefoldBelltopsScene(),
    });
    restored.importCampaign(backup);
    expect(restored.exportCampaign()).toBe(backup);
    expect(restored.frame().threefold.returnTide.epilogue).toEqual(
      content.epilogue
    );
    restored.resetSave();
    expect(actualTide(restored).deathIds).toContain('sera');
    expect(
      restored
        .getState()
        .scene.creatures.some(person => person.id === 'belltops-sera')
    ).toBe(false);
    expect(restored.getState().player.destroyedGeometryIds).toContain(
      'return-tide-hospital'
    );
    expect(restored.getSnapshot().campaign.clock.elapsedGameSeconds).toBe(5415);
  });

  test('a stale region follows shared tide time and losses instead of rewinding the world', () => {
    const storage = browserStorage();
    const quay = createThreefoldRuntime({
      storage,
      scene: createThreefoldBelltopsScene(),
    });
    const coast = createThreefoldRuntime({
      storage,
      scene: createThreefoldCrownbackReachScene(),
    });
    waitForAftermath(quay);
    expect(coast.getSnapshot().campaign.clock.elapsedGameSeconds).toBe(5400);
    expect(coast.frame().threefold.returnTide.phase).toBe('aftermath');
    coast.dispatch('interact');
    expect(actualTide(quay).observedSceneIds).toEqual(['crownback-reach']);
    expect(
      quay
        .frame()
        .threefold.returnTide.epilogue.some(row => row.startsWith('sera:'))
    ).toBe(false);
    expect(actualTide(quay).deathIds).toContain('sera');
  });

  test('blocked browser storage keeps the same tide in local play and portable export', () => {
    const runtime = createThreefoldRuntime({
      storage: null,
      scene: createThreefoldBelltopsScene(),
    });
    approach(runtime, 'return-tide-seal-control');
    runtime.dispatch('interact');
    waitForAftermath(runtime);
    expect(runtime.getPersistenceStatus().dirty).toBe(true);
    expect(actualTide(runtime).controls.sealClosed).toBe(true);
    expect(actualTide(runtime).damageIds).toContain('living-breakwater');
    expect(runtime.frame().threefold.returnTide.phase).toBe('aftermath');
  });
});
