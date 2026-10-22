import {
  createThreefoldReturnTide,
  normalizeThreefoldReturnTide,
  operateThreefoldReturnTide,
  pledgeThreefoldReturnTide,
  advanceThreefoldReturnTide,
  getThreefoldReturnTidePhase,
  getThreefoldReturnTideObligations,
  observeThreefoldReturnTide,
  THREEFOLD_RETURN_TIDE_VOLUME,
} from '../../../../src/core/browser/game/threefold/return-tide.js';

/** @returns {any} Prepared physical facts without a morality score. */
function preparedFacts() {
  return {
    intactMechanisms: [
      'seal',
      'spillway',
      'human-manifold',
      'root-manifold',
      'coast-manifold',
    ],
    availableFactions: [
      'assembly',
      'latchfolk',
      'threadbound',
      'nursery',
      'choir',
      'crownback',
    ],
    engineerAvailable: true,
    evidenceCount: 2,
    rootRelief: true,
    coastReady: true,
    preparedGroups: [
      'assembly',
      'latchfolk',
      'threadbound',
      'nursery',
      'choir',
      'crownback',
    ],
    priorDeathIds: [],
  };
}

/**
 * Install a distributed regulator through earned agreements and actual components.
 * @param {any} facts Established support.
 * @returns {any} Committed physical controls.
 */
function buildShared(facts) {
  let state = createThreefoldReturnTide();
  for (const faction of ['assembly', 'latchfolk', 'choir', 'crownback'])
    state = pledgeThreefoldReturnTide(state, faction, facts);
  for (const operation of [
    'fit-human-manifold',
    'fit-root-manifold',
    'fit-coast-manifold',
    'bind-foldglass',
  ])
    state = operateThreefoldReturnTide(state, operation, facts);
  return state;
}

describe('THREEFOLD systemic Return Tide', () => {
  test('starts with one finite warning reservoir and advances only explicit fixed action-time steps', () => {
    const state = createThreefoldReturnTide();
    const facts = preparedFacts();
    expect(
      state.volumesCubicMeters.reduce((sum, value) => sum + value, 0)
    ).toBe(THREEFOLD_RETURN_TIDE_VOLUME);
    expect(getThreefoldReturnTidePhase(state)).toBe('warning');
    expect(advanceThreefoldReturnTide(state, facts, 0)).toBe(state);
    expect(advanceThreefoldReturnTide(state, facts, 14)).toBe(state);
    const warning = advanceThreefoldReturnTide(state, facts, 1799);
    expect(warning.elapsedGameSeconds).toBe(1785);
    expect(warning.volumesCubicMeters).toEqual(state.volumesCubicMeters);
    const rising = advanceThreefoldReturnTide(warning, facts, 1800);
    expect(getThreefoldReturnTidePhase(rising)).toBe('rising');
    expect(rising.volumesCubicMeters[0]).toBeLessThan(
      THREEFOLD_RETURN_TIDE_VOLUME
    );
    expect(
      getThreefoldReturnTidePhase(
        advanceThreefoldReturnTide(rising, facts, 3600)
      )
    ).toBe('receding');
    expect(() => advanceThreefoldReturnTide(rising, facts, 1700)).toThrow(
      'backdated'
    );
    expect(() => advanceThreefoldReturnTide(state, facts, NaN)).toThrow();
  });

  test('inaction still resolves the world, with real irreversible unprepared losses and conserved water', () => {
    const facts = { ...preparedFacts(), preparedGroups: [] };
    const state = advanceThreefoldReturnTide(
      createThreefoldReturnTide(),
      facts,
      5400
    );
    expect(getThreefoldReturnTidePhase(state)).toBe('aftermath');
    expect(state.damageIds).toEqual(
      expect.arrayContaining([
        'quay-low-district',
        'quay-hospital',
        'quay-pumps',
        'root-crossings',
        'nursery-chambers',
      ])
    );
    expect(state.deathIds).toEqual(
      expect.arrayContaining([
        'sera',
        'orla',
        'mira',
        'tov',
        'pell',
        'iru',
        'neme',
      ])
    );
    expect(state.displacedGroups).toEqual(
      expect.arrayContaining(['assembly', 'choir', 'nursery', 'threadbound'])
    );
    expect(
      state.volumesCubicMeters.reduce((sum, value) => sum + value, 0)
    ).toBeCloseTo(THREEFOLD_RETURN_TIDE_VOLUME, 7);
    expect(advanceThreefoldReturnTide(state, facts, 100000)).toBe(state);
    expect(getThreefoldReturnTideObligations(state)).toEqual([]);
  });

  test('the seal protects the city while permanently cutting roots and the living breakwater', () => {
    const facts = preparedFacts();
    const sealed = operateThreefoldReturnTide(
      createThreefoldReturnTide(),
      'close-seal',
      facts
    );
    expect(sealed.damageIds).toContain('choir-branches');
    const result = advanceThreefoldReturnTide(sealed, facts, 5400);
    expect(result.peakDepthsMeters[1]).toBe(0);
    expect(result.damageIds).toEqual(
      expect.arrayContaining(['choir-branches', 'living-breakwater'])
    );
    expect(result.displacedGroups).toEqual(
      expect.arrayContaining(['choir', 'crownback'])
    );
    const reopened = operateThreefoldReturnTide(result, 'open-seal', facts);
    expect(reopened.controls.sealClosed).toBe(false);
    expect(reopened.damageIds).toEqual(result.damageIds);
  });

  test('the spillway preserves root routes while flooding the Quay; preparation changes people, not material loss', () => {
    const facts = preparedFacts();
    const spill = operateThreefoldReturnTide(
      createThreefoldReturnTide(),
      'open-spillway',
      facts
    );
    const prepared = advanceThreefoldReturnTide(spill, facts, 5400);
    const unprepared = advanceThreefoldReturnTide(
      spill,
      { ...facts, preparedGroups: [] },
      5400
    );
    expect(prepared.peakDepthsMeters[2]).toBe(0);
    expect(prepared.damageIds).toContain('quay-hospital');
    expect(prepared.deathIds).toEqual([]);
    expect(unprepared.deathIds).toContain('sera');
    expect(unprepared.damageIds).toEqual(prepared.damageIds);
  });

  test('the earned regulator still sacrifices homes, labor and Foldglass freedom', () => {
    const facts = preparedFacts();
    const built = buildShared(facts);
    expect(built.controls.foldglassBound).toBe(true);
    const result = advanceThreefoldReturnTide(built, facts, 5400);
    expect(result.regulatorFailed).toBe(false);
    expect(result.damageIds).toContain('hearthgaps-homes');
    expect(result.damageIds).toContain('quay-low-district');
    expect(result.damageIds).not.toContain('quay-hospital');
    expect(result.deathIds).toEqual([]);
    expect(getThreefoldReturnTideObligations(result)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('assembly:'),
        expect.stringContaining('Mara: Foldglass'),
      ])
    );
  });

  test('partial construction or later mechanism destruction fails without restoring past losses', () => {
    const facts = preparedFacts();
    let partial = pledgeThreefoldReturnTide(
      createThreefoldReturnTide(),
      'assembly',
      facts
    );
    partial = operateThreefoldReturnTide(partial, 'fit-human-manifold', facts);
    const failed = advanceThreefoldReturnTide(partial, facts, 5400);
    expect(failed.regulatorFailed).toBe(true);
    expect(failed.damageIds).toContain('root-crossings');
    const broken = advanceThreefoldReturnTide(
      buildShared(facts),
      {
        ...facts,
        intactMechanisms: [
          'seal',
          'spillway',
          'root-manifold',
          'coast-manifold',
        ],
      },
      5400
    );
    expect(broken.regulatorFailed).toBe(true);
    expect(broken.controls.foldglassBound).toBe(true);
    expect(broken.damageIds).toContain('quay-hospital');
  });

  test('an incomplete sacrifice channel records Latchfolk deaths during the peak', () => {
    const tide = createThreefoldReturnTide();
    tide.controls.humanManifold = true;
    tide.controls.rootManifold = true;
    tide.controls.coastManifold = true;
    const result = advanceThreefoldReturnTide(
      tide,
      { ...preparedFacts(), preparedGroups: [] },
      5400
    );

    expect(result.regulatorFailed).toBe(true);
    expect(result.peakDepthsMeters[3]).toBeGreaterThanOrEqual(0.3);
    expect(result.damageIds).toContain('hearthgaps-homes');
    expect(result.deathIds).toContain('brin');
  });

  test('independent controls form a costly hybrid rather than selecting one scripted ending', () => {
    const facts = preparedFacts();
    let state = operateThreefoldReturnTide(
      createThreefoldReturnTide(),
      'close-seal',
      facts
    );
    state = operateThreefoldReturnTide(state, 'open-spillway', facts);
    const hybrid = advanceThreefoldReturnTide(state, facts, 5400);
    expect(hybrid.controls).toMatchObject({
      sealClosed: true,
      spillwayOpen: true,
    });
    expect(hybrid.damageIds).toContain('choir-branches');
    expect(hybrid.damageIds).toContain('quay-low-district');
    expect(hybrid.peakDepthsMeters[1]).toBeGreaterThan(0);
  });

  test('agreements require evidence and actual surviving support; machinery cannot be conjured', () => {
    const facts = preparedFacts();
    const fresh = createThreefoldReturnTide();
    expect(
      pledgeThreefoldReturnTide(fresh, 'assembly', {
        ...facts,
        evidenceCount: 0,
      })
    ).toBe(fresh);
    expect(
      pledgeThreefoldReturnTide(fresh, 'assembly', {
        ...facts,
        availableFactions: [],
      })
    ).toBe(fresh);
    expect(pledgeThreefoldReturnTide(fresh, 'unknown', facts)).toBe(fresh);
    const signed = pledgeThreefoldReturnTide(fresh, 'assembly', facts);
    expect(pledgeThreefoldReturnTide(signed, 'assembly', facts)).toBe(signed);
    for (const operation of [
      'close-seal',
      'open-seal',
      'open-spillway',
      'fit-human-manifold',
      'fit-root-manifold',
      'fit-coast-manifold',
      'bind-foldglass',
      'unknown',
    ])
      expect(
        operateThreefoldReturnTide(fresh, operation, {
          ...facts,
          intactMechanisms: [],
        })
      ).toBe(fresh);
    expect(operateThreefoldReturnTide(fresh, 'bind-foldglass', facts)).toBe(
      fresh
    );
    const sealed = operateThreefoldReturnTide(fresh, 'close-seal', facts);
    expect(operateThreefoldReturnTide(sealed, 'close-seal', facts)).toBe(
      sealed
    );
  });

  test('surviving preparation cannot resurrect prior named growth deaths or erase tide deaths', () => {
    const facts = {
      ...preparedFacts(),
      preparedGroups: [],
      priorDeathIds: ['sera', 'neme'],
    };
    const flooded = advanceThreefoldReturnTide(
      createThreefoldReturnTide(),
      facts,
      4000
    );
    expect(flooded.deathIds).not.toContain('sera');
    expect(flooded.deathIds).not.toContain('neme');
    expect(flooded.deathIds).toContain('orla');
    const later = advanceThreefoldReturnTide(flooded, preparedFacts(), 5400);
    expect(later.deathIds).toEqual(flooded.deathIds);
  });

  test('long and split waits conserve the same physical history, with an independent restored copy', () => {
    const facts = preparedFacts();
    let split = createThreefoldReturnTide(900);
    for (let time = 915; time <= 6300; time += 15)
      split = advanceThreefoldReturnTide(split, facts, time);
    const whole = advanceThreefoldReturnTide(
      createThreefoldReturnTide(900),
      facts,
      6300
    );
    expect(split).toEqual(whole);
    const restored = normalizeThreefoldReturnTide(
      JSON.parse(JSON.stringify(whole))
    );
    expect(restored).toEqual(whole);
    const original = whole.volumesCubicMeters[0];
    restored.volumesCubicMeters[0] = original + 1;
    expect(whole.volumesCubicMeters[0]).toBe(original);
  });

  test('rejects malformed, contradictory and nonconserved physical save state', () => {
    const valid = createThreefoldReturnTide();
    const invalidStates = [
      null,
      [],
      { ...valid, elapsedGameSeconds: 14 },
      { ...valid, elapsedGameSeconds: 5401 },
      { ...valid, controls: {} },
      { ...valid, regulatorFailed: 'false' },
      { ...valid, volumesCubicMeters: [0, 0, 0, 0, 0] },
      { ...valid, volumesCubicMeters: null },
      { ...valid, volumesCubicMeters: [THREEFOLD_RETURN_TIDE_VOLUME] },
      { ...valid, volumesCubicMeters: [-1, 20001, 0, 0, 0] },
      { ...valid, peakDepthsMeters: [0, 0, 0, 0, 0] },
      { ...valid, agreements: ['assembly', 'assembly'] },
    ];
    for (const candidate of invalidStates)
      expect(() => normalizeThreefoldReturnTide(candidate)).toThrow();
  });

  test('surveys only valid aftermath scenes and never repeats a local account', () => {
    const facts = preparedFacts();
    const warning = createThreefoldReturnTide();
    expect(observeThreefoldReturnTide(warning, 'belltops')).toBe(warning);
    const aftermath = advanceThreefoldReturnTide(warning, facts, 5400);
    expect(observeThreefoldReturnTide(aftermath, 'unknown')).toBe(aftermath);
    const surveyed = observeThreefoldReturnTide(aftermath, 'belltops');
    expect(surveyed.observedSceneIds).toEqual(['belltops']);
    expect(observeThreefoldReturnTide(surveyed, 'belltops')).toBe(surveyed);
  });
});
