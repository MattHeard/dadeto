import { createThreefoldHearthgapsScene } from '../../../../src/core/browser/game/threefold/hearthgaps.js';
import { createThreefoldSiltMarginScene } from '../../../../src/core/browser/game/threefold/silt-margin.js';
import { createThreefoldSimulation } from '../../../../src/core/browser/game/threefold/simulation.js';
import { renderThreefoldFrame } from '../../../../src/core/browser/game/threefold/renderer.js';
import {
  createThreefoldReturnTide,
  getThreefoldReturnTideObligations,
} from '../../../../src/core/browser/game/threefold/return-tide.js';
import {
  presentThreefoldReturnTide,
  renderThreefoldReturnTide,
} from '../../../../src/core/browser/game/threefold/return-tide-presentation.js';

const CRISIS_THRESHOLDS = {
  urgentAtMinutes: 4,
  surgeAtMinutes: 9,
  aftermathAtMinutes: 15,
};

/** @returns {any} Earned but deliberately empty local prerequisites. */
function facts() {
  return {
    intactMechanisms: [],
    availableFactions: [],
    engineerAvailable: false,
    evidenceCount: 0,
    rootRelief: false,
    coastReady: false,
    preparedGroups: [],
    priorDeathIds: [],
  };
}

/** @returns {any} Final observed record with all authored costs. */
function observedAftermath() {
  return {
    ...createThreefoldReturnTide(),
    elapsedGameSeconds: 5400,
    controls: { ...createThreefoldReturnTide().controls, foldglassBound: true },
    agreements: ['assembly'],
    observedSceneIds: [
      'belltops',
      'lantern-ward',
      'hearthgaps',
      'weftways',
      'grainlands',
      'silt-margin',
      'crownback-reach',
      'wakeform-shoals',
      'small-world-sluice',
    ],
    damageIds: [
      'quay-low-district',
      'quay-hospital',
      'quay-pumps',
      'choir-branches',
      'root-crossings',
      'hearthgaps-homes',
      'nursery-chambers',
      'living-breakwater',
    ],
    deathIds: ['mira', 'brin', 'pell', 'iru', 'neme'],
    displacedGroups: [
      'assembly',
      'latchfolk',
      'threadbound',
      'nursery',
      'choir',
    ],
    rememberedGrowthDeaths: ['sera'],
  };
}

describe('THREEFOLD Return Tide accessible presentation', () => {
  test('explains the warning horizon and avoids reporting losses from unseen places', () => {
    const state = createThreefoldSimulation(
      CRISIS_THRESHOLDS,
      createThreefoldHearthgapsScene()
    );
    state.scene.interactables = [];
    const warning = presentThreefoldReturnTide(
      state,
      createThreefoldReturnTide(),
      facts()
    );
    const unseenAftermath = presentThreefoldReturnTide(
      state,
      { ...observedAftermath(), damageIds: [] },
      facts()
    );
    const failedRisingRegulator = presentThreefoldReturnTide(
      state,
      {
        ...createThreefoldReturnTide(),
        elapsedGameSeconds: 1800,
        regulatorFailed: true,
      },
      facts()
    );

    expect(warning.text).toContain('Return Tide rises in 30 game minutes');
    expect(failedRisingRegulator.text).toContain(
      'The incomplete or damaged distributed regulator failed.'
    );
    expect(failedRisingRegulator.text).toContain(
      'Surviving preparation changes casualties'
    );
    expect(unseenAftermath.epilogue).toContain(
      'hearthgaps: the high-water survey is recorded.'
    );
    expect(unseenAftermath.epilogue).not.toContain(
      'Low Quay homes flooded; residents need new shelter.'
    );
  });

  test('reports every surveyed physical loss, survival, displacement, death and continuing obligation', () => {
    const state = createThreefoldSimulation(
      CRISIS_THRESHOLDS,
      createThreefoldHearthgapsScene()
    );
    state.scene.interactables = [];
    const content = presentThreefoldReturnTide(
      state,
      observedAftermath(),
      facts()
    );

    expect(content).toMatchObject({
      phase: 'aftermath',
      finished: true,
      interaction: null,
    });
    expect(content.epilogue).toEqual(
      expect.arrayContaining([
        'hearthgaps: the high-water survey is recorded.',
        'Low Quay homes flooded; residents need new shelter.',
        'The hospital approach is lost; surviving crews must move care uphill.',
        'City pumps are ruined; recovery needs manual drainage and replacement machinery.',
        'The Final Seal severed irreplaceable Choir branches. Reopening cannot revive them.',
        'Deep-root crossings are lost; the caravans need alternate paths.',
        'The sacrifice channel flooded Latchfolk homes. The manual agreement did not spare their buildings.',
        'Nursery chambers flooded; surviving Clades must relocate their remaining young.',
        'The living breakwater died back after the deep channels were cut.',
        'sera: the earlier growth death remains; the tide did not restore this person.',
        'orla: survived and writes from an upland refuge; their old home or post remains lost.',
        'tharn: survived here. Prior choices and debts remain.',
        'Assembly: keep daily hand-operated tide-control shifts staffed at the Quay.',
        'Low Quay: survey shelter above the flood line before displaced residents choose whether to return.',
        'Hospital approach: keep care uphill until the route can be restored.',
        'City pumps: replace the ruined pumps and drain retained water before reopening the lower works.',
        'Silt Choir: document surviving branches and route around the permanently severed paths.',
        'Deep roots: establish an alternate crossing before the caravan route is restored.',
        'Hearthgaps: secure upland shelter; draining the sacrifice channel cannot restore these homes.',
        'Nursery Clades: move the remaining young and rebuild chambers above the flood line.',
        'Living breakwater: protect surviving shoots; the lost deep-root reaches cannot regrow.',
        expect.stringContaining('Mara: Foldglass is bound to the regulator'),
        'The distributed response still sacrificed homes and Foldglass freedom; this is no cost-free ending.',
      ])
    );
  });

  test.each([
    {
      passengerOutcome: 'evacuated',
      ferryOutcome: 'afloat',
      reportFiled: true,
      iriConfessionDisclosed: true,
      civic:
        'Civic reckoning: Iri’s confession is public; the Assembly calls for the missing relay warnings to be traced before responsibility is assigned.',
      harbor:
        'Harbor reckoning: Both ferry passenger groups reached shore before the surge; harbor crews can draw on their surviving engineers.',
    },
    {
      passengerOutcome: 'partial',
      ferryOutcome: 'lost',
      reportFiled: true,
      iriConfessionDisclosed: false,
      civic:
        'Civic reckoning: Iri’s pressure-regulator log is public, but the confession about thinning relay warnings was not filed; responsibility remains contested.',
      harbor:
        'Harbor reckoning: One ferry passenger group reached shore; the other was lost with the wreck, leaving fewer harbor engineers for recovery.',
    },
    {
      passengerOutcome: 'lost',
      ferryOutcome: 'lost',
      reportFiled: false,
      iriConfessionDisclosed: false,
      civic:
        'Civic reckoning: Mara filed no signal-station report, so the Assembly has no public account from her of Iri’s pressure-regulator decisions.',
      harbor:
        'Harbor reckoning: Neither ferry passenger group reached shore before the ferry was lost.',
    },
  ])(
    'derives civic aftermath from public disclosure and ferry outcome %s',
    scenario => {
      const state = createThreefoldSimulation(
        CRISIS_THRESHOLDS,
        createThreefoldHearthgapsScene()
      );
      const content = presentThreefoldReturnTide(state, observedAftermath(), {
        ...facts(),
        civicAccount: {
          reportFiled: scenario.reportFiled,
          iriConfessionDisclosed: scenario.iriConfessionDisclosed,
          passengerOutcome: scenario.passengerOutcome,
          ferryOutcome: scenario.ferryOutcome,
        },
      });

      expect(content.epilogue).toContain(scenario.civic);
      expect(content.epilogue).toContain(scenario.harbor);
    }
  );

  test('keeps civic and harbor accounts hidden until Belltops is actually surveyed', () => {
    const state = createThreefoldSimulation(
      CRISIS_THRESHOLDS,
      createThreefoldHearthgapsScene()
    );
    const tide = {
      ...observedAftermath(),
      observedSceneIds: observedAftermath().observedSceneIds.filter(
        sceneId => sceneId !== 'belltops'
      ),
    };
    const content = presentThreefoldReturnTide(state, tide, {
      ...facts(),
      civicAccount: {
        reportFiled: true,
        iriConfessionDisclosed: true,
        passengerOutcome: 'evacuated',
        ferryOutcome: 'lost',
      },
    });

    expect(content.epilogue).not.toEqual(
      expect.arrayContaining([
        expect.stringContaining('Civic reckoning:'),
        expect.stringContaining('Harbor reckoning:'),
      ])
    );
  });

  test('names signed shift duties and reveals each repair obligation only after its place is surveyed', () => {
    const tide = {
      ...createThreefoldReturnTide(),
      agreements: [
        'assembly',
        'latchfolk',
        'threadbound',
        'nursery',
        'choir',
        'crownback',
        'unknown',
      ],
      damageIds: ['hearthgaps-homes', 'quay-low-district', 'unknown'],
    };
    expect(getThreefoldReturnTideObligations(tide)).toEqual([
      'Assembly: keep daily hand-operated tide-control shifts staffed at the Quay.',
      'Latchfolk: keep daily tide-control shifts staffed from the lower service paths.',
      'Threadbound: keep daily tide-control shifts staffed and the caravan relay in service.',
      'Nursery Clades: keep daily tide-control shifts staffed while protecting the remaining young.',
      'Silt Choir: keep daily tide-control shifts staffed and map the surviving root branches.',
      'Crownbacks: keep daily tide-control shifts staffed and the coastal migration corridor clear.',
    ]);

    tide.observedSceneIds = ['hearthgaps'];
    expect(getThreefoldReturnTideObligations(tide)).toContain(
      'Hearthgaps: secure upland shelter; draining the sacrifice channel cannot restore these homes.'
    );
    expect(getThreefoldReturnTideObligations(tide)).not.toContain(
      'Low Quay: survey shelter above the flood line before displaced residents choose whether to return.'
    );

    tide.observedSceneIds.push('lantern-ward');
    expect(getThreefoldReturnTideObligations(tide)).toContain(
      'Low Quay: survey shelter above the flood line before displaced residents choose whether to return.'
    );
  });

  test('keeps warning text quiet without a nearby control and wraps a reachable handheld prompt on grid', () => {
    const state = createThreefoldSimulation(
      CRISIS_THRESHOLDS,
      createThreefoldSiltMarginScene()
    );
    state.scene.interactables = [];
    const frame = renderThreefoldFrame(state);
    const quiet = renderThreefoldReturnTide(frame, state, {
      phase: 'warning',
      interaction: null,
      notice: '',
      hud: 'RETURN TIDE WARNING',
      epilogue: [],
    });
    expect(quiet.shapes.some(shape => shape.x === 0 && shape.y === 112)).toBe(
      false
    );

    const prompted = renderThreefoldReturnTide(frame, state, {
      phase: 'rising',
      interaction: null,
      notice: 'The physically finite tide has now flooded the lower crossing.',
      hud: 'RETURN TIDE',
      epilogue: [],
    });
    const panel = prompted.shapes.filter(
      shape => shape.type === 'rect' && shape.x === 0 && shape.y === 112
    );
    expect(panel).toHaveLength(1);
    expect(
      prompted.shapes.some(shape =>
        shape.text?.includes('physically finite tide')
      )
    ).toBe(true);
    expect(panel.every(shape => shape.x % 8 === 0 && shape.y % 8 === 0)).toBe(
      true
    );
    expect(prompted.toast).toContain(frame.toast);
    expect(prompted.toast).toContain('physically finite tide');
    const noExistingToast = renderThreefoldReturnTide(
      { ...frame, toast: '' },
      state,
      {
        phase: 'rising',
        interaction: null,
        notice: 'New water reaches the path.',
        hud: 'RETURN TIDE',
        epilogue: [],
      }
    );
    expect(noExistingToast.toast).toBe('New water reaches the path.');
  });

  test('renders surviving small-world actors, omits dead or positionless people, and shows reachable costs', () => {
    const state = createThreefoldSimulation(
      CRISIS_THRESHOLDS,
      createThreefoldSiltMarginScene()
    );
    const neme = state.scene.creatures.find(
      creature => creature.id === 'silt-margin-neme'
    );
    const originalCreatures = state.scene.creatures;
    const living = renderThreefoldReturnTide(
      { ...renderThreefoldFrame(state), toast: '' },
      state,
      {
        phase: 'aftermath',
        interaction: null,
        notice: '',
        hud: 'LOCAL TIDE SURVEY',
        epilogue: [],
      }
    );
    expect(living.shapes.some(shape => shape.actorId === neme.id)).toBe(true);
    expect(
      living.shapes.some(shape => shape.text === 'LOCAL TIDE SURVEY')
    ).toBe(true);
    state.scene = {
      ...state.scene,
      creatures: originalCreatures.map(creature =>
        creature.id === 'silt-margin-neme'
          ? { id: creature.id, bounds: creature.bounds }
          : creature
      ),
    };
    const positionless = renderThreefoldReturnTide(
      renderThreefoldFrame(state),
      state,
      {
        phase: 'warning',
        interaction: { label: 'A OPEN ROOT MANIFOLD' },
        notice: '',
        hud: 'RETURN TIDE',
        epilogue: [],
      }
    );
    expect(positionless.shapes.some(shape => shape.actorId === neme.id)).toBe(
      false
    );
    expect(positionless.shapes.some(shape => shape.y === 112)).toBe(true);

    const deceased = {
      ...state,
      scene: {
        ...state.scene,
        creatures: originalCreatures,
      },
      encounter: {
        ...state.encounter,
        growthDeaths: [{ creatureId: neme.id, cause: 'growth' }],
      },
      player: {
        ...state.player,
        destroyedGeometryIds: ['return-tide-root-manifold'],
      },
    };
    const markers = renderThreefoldReturnTide(
      renderThreefoldFrame(deceased),
      deceased,
      {
        phase: 'warning',
        interaction: null,
        notice: '',
        hud: 'RETURN TIDE',
        epilogue: [],
      }
    );
    expect(markers.shapes.some(shape => shape.actorId === neme.id)).toBe(false);
    expect(
      markers.shapes.some(
        shape => shape.geometryId === 'return-tide-root-manifold'
      )
    ).toBe(false);
  });
});
