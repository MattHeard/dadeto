import { createBrokenGateScene } from '../../../../src/core/browser/game/threefold/gatehouse.js';
import { THREEFOLD_GATE_REPAIR_GEOMETRY_IDS } from '../../../../src/core/browser/game/threefold/episode.js';
import { createThreefoldSluiceScene } from '../../../../src/core/browser/game/threefold/sluice-scene.js';
import {
  restoreThreefoldSimulation,
  serializeThreefoldSimulation,
} from '../../../../src/core/browser/game/threefold/save.js';
import { renderThreefoldFrame } from '../../../../src/core/browser/game/threefold/renderer.js';
import { createScaleState } from '../../../../src/core/browser/game/threefold/spatial.js';
import {
  createThreefoldSimulation,
  stepThreefoldSimulation,
} from '../../../../src/core/browser/game/threefold/simulation.js';

const THRESHOLDS = {
  urgentAtMinutes: 4,
  surgeAtMinutes: 9,
  aftermathAtMinutes: 15,
};

describe('THREEFOLD optional aid for displaced Latchfolk', () => {
  test('records one optional aid action and preserves it in the save', () => {
    const aftermath = createFloodedSafeLatchfolkAftermath();
    expect(renderThreefoldFrame(aftermath).toast).toContain('E HELP LATCHFOLK');

    const helped = stepThreefoldSimulation(aftermath, { type: 'interact' });
    expect(helped.episode.witnessLedger.at(-1)).toMatchObject({
      type: 'observation',
      action: 'latchfolk-displacement-aid',
      intention: 'Help the displaced Latchfolk arrange temporary shelter.',
      consequence: {
        crisisStage: 'aftermath',
        drainageState: 'flooded',
        latchfolk: 'safe',
      },
      relatedEventId: null,
    });
    expect(renderThreefoldFrame(helped)).toMatchObject({
      toast: expect.stringContaining('LATCHFOLK AID IN JOURNAL'),
      threefold: {
        latchfolkAid: {
          title: 'Help for displaced Latchfolk',
          text: expect.stringContaining('Floodwater remains in their homes.'),
        },
      },
    });
    const afterRepeat = stepThreefoldSimulation(helped, {
      type: 'interact',
    });
    expect(
      afterRepeat.episode.witnessLedger.filter(
        entry => entry.action === 'latchfolk-displacement-aid'
      )
    ).toHaveLength(1);
    expect(afterRepeat.episode.witnessLedger.at(-1).action).toBe(
      'latchfolk-witness-lead'
    );
    expect(
      restoreThreefoldSimulation(serializeThreefoldSimulation(helped))
    ).toEqual(helped);
  });

  test('gates aid on survival, flood history, aftermath, reach, and closure', () => {
    const aftermath = createFloodedSafeLatchfolkAftermath();
    const beforeAftermath = {
      ...aftermath,
      crisis: { ...aftermath.crisis, elapsedMinutes: 9, stage: 'surge' },
    };
    const outOfReach = {
      ...aftermath,
      player: createScaleState(
        { x: 2, y: 2 },
        { destroyedGeometryIds: aftermath.player.destroyedGeometryIds }
      ),
    };
    const lostLatchfolk = {
      ...aftermath,
      episode: { ...aftermath.episode, latchfolk: 'lost' },
    };
    const closed = {
      ...aftermath,
      episode: { ...aftermath.episode, closedBy: 'reported' },
    };
    const candidates = [
      beforeAftermath,
      outOfReach,
      lostLatchfolk,
      closed,
      createSafeWatchkeeperAftermath(),
      repairGateOutcome(aftermath, true),
      createThreefoldSimulation(THRESHOLDS, createThreefoldSluiceScene()),
    ];

    for (const candidate of candidates) {
      const result = stepThreefoldSimulation(candidate, { type: 'interact' });
      expect(result.episode.witnessLedger || []).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({ action: 'latchfolk-displacement-aid' }),
        ])
      );
      expect(renderThreefoldFrame(result).threefold.latchfolkAid).toBeFalsy();
    }

    const alreadyHelped = stepThreefoldSimulation(aftermath, {
      type: 'interact',
    });
    const repeated = stepThreefoldSimulation(alreadyHelped, {
      type: 'interact',
    });
    expect(
      repeated.episode.witnessLedger.filter(
        entry => entry.action === 'latchfolk-displacement-aid'
      )
    ).toHaveLength(1);
    expect(
      renderThreefoldFrame(alreadyHelped).threefold.latchfolkAid
    ).toBeTruthy();

    const receded = repairGateOutcome(aftermath, false);
    const helpedAfterRepair = stepThreefoldSimulation(receded, {
      type: 'interact',
    });
    expect(
      renderThreefoldFrame(helpedAfterRepair).threefold.latchfolkAid.text
    ).toContain('Water has receded, but their homes remain damaged.');
  });

  test('keeps report and destroyed-station departure available after aid', () => {
    const helped = stepThreefoldSimulation(
      createFloodedSafeLatchfolkAftermath(),
      { type: 'interact' }
    );
    const scene = createBrokenGateScene();
    const console = scene.interactables.find(
      item => item.id === 'signal-station-console'
    );
    const road = scene.interactables.find(
      item => item.id === 'upland-road-exit'
    );
    const reported = stepThreefoldSimulation(
      {
        ...helped,
        player: createScaleState(console.position, {
          destroyedGeometryIds: helped.player.destroyedGeometryIds,
        }),
      },
      { type: 'interact' }
    );
    const departed = stepThreefoldSimulation(
      {
        ...helped,
        player: createScaleState(road.position, {
          destroyedGeometryIds: [
            ...helped.player.destroyedGeometryIds,
            'signal-station',
          ],
        }),
      },
      { type: 'interact' }
    );

    expect(reported.episode.closedBy).toBe('reported');
    expect(departed.episode.closedBy).toBe('departed');
    expect(
      renderThreefoldFrame(reported).threefold.latchfolkAid
    ).not.toBeNull();
    expect(
      renderThreefoldFrame(departed).threefold.latchfolkAid
    ).not.toBeNull();
  });

  test('reveals Iri’s recorded confession only after the watchkeeper lead and report', () => {
    let state = createFloodedSafeLatchfolkAftermath();
    state = stepThreefoldSimulation(state, { type: 'interact' });
    state = stepThreefoldSimulation(state, { type: 'interact' });
    expect(renderThreefoldFrame(state).threefold.iriWitnessLead).not.toBeNull();
    expect(
      renderThreefoldFrame(state).threefold.iriRecordedConfession
    ).toBeNull();

    const console = state.scene.interactables.find(
      item => item.id === 'signal-station-console'
    );
    const atConsole = {
      ...state,
      player: createScaleState(console.position, {
        destroyedGeometryIds: state.player.destroyedGeometryIds,
      }),
    };
    const reported = stepThreefoldSimulation(atConsole, { type: 'interact' });
    const confession =
      renderThreefoldFrame(reported).threefold.iriRecordedConfession;
    const epilogue = renderThreefoldFrame(reported).threefold.episodeEpilogue;
    const communityResponse =
      'The report carries Iri’s account to the surviving Latchfolk watchkeeper. They ask for the downstream relay stations to be traced before responsibility is assigned; the final sender and missed warnings remain unknown.';

    expect(reported.episode.closedBy).toBe('reported');
    expect(epilogue.paragraphs).toContain(communityResponse);
    expect(confession.title).toBe("Iri's recorded confession");
    expect(confession.text).toContain(
      'I saw downstream relay messages thinning'
    );
    expect(confession.text).toContain(
      'left my uncertainty out of the handover'
    );
    expect(confession.text).toContain('does not identify the final sender');
    const restored = restoreThreefoldSimulation(
      serializeThreefoldSimulation(reported)
    );
    expect(
      renderThreefoldFrame(restored).threefold.iriRecordedConfession
    ).toEqual(confession);
    expect(renderThreefoldFrame(restored).threefold.episodeEpilogue).toEqual(
      epilogue
    );

    const lostWatchkeeper = {
      ...reported,
      episode: { ...reported.episode, latchfolk: 'lost' },
    };
    expect(
      renderThreefoldFrame(lostWatchkeeper).threefold.episodeEpilogue.paragraphs
    ).not.toContain(communityResponse);

    const withoutLead = createSafeWatchkeeperAftermath();
    const reportConsole = withoutLead.scene.interactables.find(
      item => item.id === 'signal-station-console'
    );
    const reportedWithoutLead = stepThreefoldSimulation(
      {
        ...withoutLead,
        player: createScaleState(reportConsole.position, {
          destroyedGeometryIds: withoutLead.player.destroyedGeometryIds,
        }),
      },
      { type: 'interact' }
    );
    expect(reportedWithoutLead.episode.closedBy).toBe('reported');
    expect(
      renderThreefoldFrame(reportedWithoutLead).threefold.episodeEpilogue
        .paragraphs
    ).not.toContain(communityResponse);

    const road = state.scene.interactables.find(
      item => item.id === 'upland-road-exit'
    );
    const atDestroyedStationRoad = {
      ...state,
      player: createScaleState(road.position, {
        destroyedGeometryIds: [
          ...state.player.destroyedGeometryIds,
          'signal-station',
        ],
      }),
    };
    const departed = stepThreefoldSimulation(atDestroyedStationRoad, {
      type: 'interact',
    });
    expect(departed.episode.closedBy).toBe('departed');
    expect(
      renderThreefoldFrame(departed).threefold.episodeEpilogue.paragraphs
    ).not.toContain(communityResponse);
    expect(renderThreefoldFrame(departed).threefold.iriRecordedConfession).toBe(
      null
    );
  });
});

/**
 * Create the broken-gate branch, warn survivors, and reach aftermath.
 * @returns {ReturnType<typeof createThreefoldSimulation>} Flooded aftermath with safe residents.
 */
function createFloodedSafeLatchfolkAftermath() {
  let state = forceReliefGateOpen();
  const watchkeeper = state.scene.interactables.find(
    item => item.id === 'latchfolk-watchkeeper'
  );
  state = {
    ...state,
    player: createScaleState(watchkeeper.position, {
      destroyedGeometryIds: state.player.destroyedGeometryIds,
    }),
  };
  state = stepThreefoldSimulation(state, { type: 'interact' });
  return stepThreefoldSimulation(state, {
    type: 'wait',
    elapsedGameMinutes: 15 - state.crisis.elapsedMinutes,
  });
}

/**
 * Create a dry aftermath with the watchkeeper safely warned.
 * @returns {ReturnType<typeof createThreefoldSimulation>} Dry aftermath with safe residents.
 */
function createSafeWatchkeeperAftermath() {
  const scene = createBrokenGateScene();
  const watchkeeper = scene.interactables.find(
    item => item.id === 'latchfolk-watchkeeper'
  );
  let state = createThreefoldSimulation(THRESHOLDS, scene);
  state = { ...state, player: createScaleState(watchkeeper.position) };
  state = stepThreefoldSimulation(state, { type: 'interact' });
  return stepThreefoldSimulation(state, {
    type: 'wait',
    elapsedGameMinutes: 15 - state.crisis.elapsedMinutes,
  });
}

/**
 * Apply a saved repaired-gate outcome to a flood aftermath.
 * @param {ReturnType<typeof createThreefoldSimulation>} state Flood aftermath.
 * @param {boolean} beforeSurge Whether the gate was repaired before surge.
 * @returns {ReturnType<typeof createThreefoldSimulation>} Repaired aftermath.
 */
function repairGateOutcome(state, beforeSurge) {
  return {
    ...state,
    player: {
      ...state.player,
      destroyedGeometryIds: state.player.destroyedGeometryIds.filter(
        id => !THREEFOLD_GATE_REPAIR_GEOMETRY_IDS.includes(id)
      ),
    },
    episode: {
      ...state.episode,
      gateRepaired: true,
      ...(beforeSurge ? { gateRepairedBeforeSurge: true } : {}),
    },
  };
}

/**
 * Reproduce the physical growth route that forces the relief gate open.
 * @returns {ReturnType<typeof createThreefoldSimulation>} Gate-forced-open simulation.
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
  return actions.reduce((state, action) => {
    const frame = renderThreefoldFrame(state);
    return stepThreefoldSimulation(state, {
      ...action,
      preActionFrame: frame,
    });
  }, createThreefoldSimulation(THRESHOLDS));
}
