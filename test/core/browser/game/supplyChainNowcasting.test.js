import { planSupplyChain } from '../../../../src/core/browser/game/supply-chain-nowcasting/supply-chain-nowcasting.js';

/**
 * @param {object} [overrides] Top-level scenario fields to replace.
 * @returns {object} Deterministic sample network.
 */
function scenario(overrides = {}) {
  return {
    horizonDays: 5,
    suppliers: [
      { id: 'north', capacityUnitsPerDay: 20, unit: 'units/day' },
      { id: 'south', capacityUnitsPerDay: 10, unit: 'units/day' },
    ],
    destination: {
      id: 'market',
      dailyDemandUnits: 10,
      startingInventoryUnits: 10,
      unit: 'units/day',
    },
    routes: [
      {
        id: 'north-lane',
        fromId: 'north',
        toId: 'market',
        capacityUnitsPerDay: 10,
        maxCapacityUnitsPerDay: 20,
        leadTimeDays: 0,
      },
    ],
    disruption: {
      routeId: 'north-lane',
      startsDay: 2,
      reductionPercent: 100,
      warningLeadDays: 2,
    },
    mitigations: [
      {
        id: 'fast-backup',
        routeId: 'north-lane',
        capacityUnitsPerDay: 10,
        leadTimeDays: 2,
      },
      {
        id: 'slow-backup',
        routeId: 'north-lane',
        capacityUnitsPerDay: 10,
        leadTimeDays: 4,
      },
      {
        id: 'oversized-backup',
        routeId: 'north-lane',
        capacityUnitsPerDay: 11,
        leadTimeDays: 1,
      },
    ],
    ...overrides,
  };
}

test('computes hand-checked daily shortfall and ranks mitigation by units saved', () => {
  const result = planSupplyChain(scenario());
  expect(result.baseline).toMatchObject({
    totalShortfallUnits: 30,
    firstShortfallDay: 3,
  });
  expect(result.signal).toEqual({
    status: 'early-warning',
    decisionDay: 0,
    disruptionDay: 2,
    leadTimeDays: 2,
    hypothetical: true,
  });
  expect(result.rankingCriterion).toBe('shortfall-avoided-units');
  expect(
    result.rankedMitigations.map(({ id, shortfallAvoidedUnits }) => [
      id,
      shortfallAvoidedUnits,
    ])
  ).toEqual([
    ['fast-backup', 30],
    ['slow-backup', 20],
    ['oversized-backup', 0],
  ]);
  expect(result.rankedMitigations[2]).toMatchObject({
    feasible: false,
    reason: 'exceeds-available-capacity',
  });
});

test('is deterministic and uses identifier order to break equal-score ties', () => {
  const input = scenario({
    mitigations: [
      {
        id: 'zeta',
        routeId: 'north-lane',
        capacityUnitsPerDay: 10,
        leadTimeDays: 2,
      },
      {
        id: 'alpha',
        routeId: 'north-lane',
        capacityUnitsPerDay: 10,
        leadTimeDays: 2,
      },
    ],
  });
  expect(planSupplyChain(input)).toEqual(planSupplyChain(input));
  expect(planSupplyChain(input).rankedMitigations.map(({ id }) => id)).toEqual([
    'alpha',
    'zeta',
  ]);
});

test.each([
  ['null input', null, 'Provide a scenario object'],
  ['primitive input', 'invalid', 'Provide a scenario object'],
  ['array input', [], 'Provide a scenario object'],
  ['zero horizon', scenario({ horizonDays: 0 }), 'positive whole number'],
  ['missing suppliers', scenario({ suppliers: null }), 'at least one supplier'],
  ['missing routes', scenario({ routes: null }), 'at least one route'],
  [
    'invalid mitigations collection',
    scenario({ mitigations: null }),
    'Mitigations must be an array',
  ],
  [
    'missing destination',
    scenario({ destination: null }),
    'destination with a valid ID',
  ],
  [
    'blank destination ID',
    scenario({ destination: { ...scenario().destination, id: ' ' } }),
    'destination with a valid ID',
  ],
  [
    'wrong destination unit',
    scenario({ destination: { ...scenario().destination, unit: 'kg/day' } }),
    'Destination demand unit',
  ],
  [
    'invalid starting inventory',
    scenario({
      destination: { ...scenario().destination, startingInventoryUnits: -1 },
    }),
    'Starting inventory',
  ],
  [
    'duplicate supplier ID',
    scenario({ suppliers: [scenario().suppliers[0], scenario().suppliers[0]] }),
    'Duplicate supplier ID',
  ],
  [
    'wrong unit',
    scenario({ suppliers: [{ ...scenario().suppliers[0], unit: 'kg/day' }] }),
    'unit must be units/day',
  ],
  [
    'invalid supplier capacity',
    scenario({
      suppliers: [{ ...scenario().suppliers[0], capacityUnitsPerDay: NaN }],
    }),
    'finite non-negative',
  ],
  [
    'unknown route supplier',
    scenario({ routes: [{ ...scenario().routes[0], fromId: 'unknown' }] }),
    'known supplier',
  ],
  [
    'cycle or unsupported route',
    scenario({
      routes: [{ ...scenario().routes[0], fromId: 'market', toId: 'north' }],
    }),
    'cycle',
  ],
  [
    'invalid demand',
    scenario({
      destination: { ...scenario().destination, dailyDemandUnits: Infinity },
    }),
    'finite non-negative',
  ],
  [
    'route capacity above maximum',
    scenario({
      routes: [{ ...scenario().routes[0], capacityUnitsPerDay: 21 }],
    }),
    'exceeds its maximum',
  ],
  [
    'route capacity above supplier',
    scenario({
      suppliers: [{ ...scenario().suppliers[0], capacityUnitsPerDay: 5 }],
    }),
    'exceeds supplier capacity',
  ],
  [
    'invalid route lead time',
    scenario({ routes: [{ ...scenario().routes[0], leadTimeDays: 1.5 }] }),
    'non-negative whole number',
  ],
  [
    'unknown disruption route',
    scenario({ disruption: { ...scenario().disruption, routeId: 'missing' } }),
    'known route',
  ],
  [
    'invalid disruption day',
    scenario({ disruption: { ...scenario().disruption, startsDay: -1 } }),
    'Disruption start day',
  ],
  [
    'invalid warning lead time',
    scenario({
      disruption: { ...scenario().disruption, warningLeadDays: 1.5 },
    }),
    'Warning lead time',
  ],
  [
    'invalid disruption reduction',
    scenario({
      disruption: { ...scenario().disruption, reductionPercent: 101 },
    }),
    'between 0 and 100 percent',
  ],
  [
    'missing mitigation ID',
    scenario({ mitigations: [{ ...scenario().mitigations[0], id: '' }] }),
    'Mitigation IDs',
  ],
  [
    'unknown mitigation route',
    scenario({
      mitigations: [{ ...scenario().mitigations[0], routeId: 'unknown' }],
    }),
    'must refer to a known route',
  ],
  [
    'invalid mitigation capacity',
    scenario({
      mitigations: [{ ...scenario().mitigations[0], capacityUnitsPerDay: -1 }],
    }),
    'Mitigation fast-backup capacity',
  ],
  [
    'invalid mitigation lead time',
    scenario({
      mitigations: [{ ...scenario().mitigations[0], leadTimeDays: -1 }],
    }),
    'Mitigation fast-backup lead time',
  ],
])('rejects %s with an explicit issue', (_label, input, expectedIssue) => {
  expect(planSupplyChain(input)).toMatchObject({ error: 'invalid-input' });
  expect(planSupplyChain(input).issues.join(' ')).toContain(expectedIssue);
});

test('labels an already-current disruption and reports no shortage when supply is adequate', () => {
  const result = planSupplyChain(
    scenario({
      disruption: {
        ...scenario().disruption,
        reductionPercent: 0,
        warningLeadDays: 0,
      },
      mitigations: [],
    })
  );
  expect(result.signal.status).toBe('current-disruption');
  expect(result.baseline).toMatchObject({
    totalShortfallUnits: 0,
    firstShortfallDay: null,
  });
});

test('route lead time delays deliveries until its arrival day', () => {
  const result = planSupplyChain(
    scenario({
      routes: [{ ...scenario().routes[0], leadTimeDays: 2 }],
      disruption: {
        ...scenario().disruption,
        startsDay: 5,
        reductionPercent: 0,
        warningLeadDays: 0,
      },
      mitigations: [],
    })
  );
  expect(
    result.baseline.daily.slice(0, 2).map(({ deliveries }) => deliveries)
  ).toEqual([0, 0]);
  expect(result.baseline.daily[2].deliveries).toBe(10);
});

test('a candidate that arrives after the simulation horizon remains infeasible', () => {
  const result = planSupplyChain(
    scenario({
      mitigations: [
        {
          id: 'too-late',
          routeId: 'north-lane',
          capacityUnitsPerDay: 10,
          leadTimeDays: 6,
        },
      ],
    })
  );
  expect(result.rankedMitigations[0]).toMatchObject({
    feasible: false,
    reason: 'arrives-after-horizon',
    shortfallAvoidedUnits: 0,
  });
});
