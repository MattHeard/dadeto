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
      maxBufferUnits: 20,
      unit: 'units/day',
    },
    rankingCriterion: 'shortfall-then-cost',
    routes: [
      {
        id: 'north-lane',
        fromId: 'north',
        toId: 'market',
        capacityUnitsPerDay: 10,
        maxCapacityUnitsPerDay: 20,
        leadTimeDays: 0,
        unitCostCents: 5,
      },
    ],
    disruption: {
      routeId: 'north-lane',
      startsDay: 2,
      durationDays: 10,
      reductionPercent: 100,
      warningLeadDays: 2,
    },
    mitigations: [
      {
        id: 'fast-backup',
        kind: 'capacity',
        routeId: 'north-lane',
        capacityUnitsPerDay: 10,
        leadTimeDays: 2,
        unitCostCents: 8,
      },
      {
        id: 'slow-backup',
        kind: 'capacity',
        routeId: 'north-lane',
        capacityUnitsPerDay: 10,
        leadTimeDays: 4,
        unitCostCents: 8,
      },
      {
        id: 'oversized-backup',
        kind: 'capacity',
        routeId: 'north-lane',
        capacityUnitsPerDay: 11,
        leadTimeDays: 1,
        unitCostCents: 8,
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
    totalCostCents: 50,
  });
  expect(result.signal).toEqual({
    status: 'early-warning',
    decisionDay: 0,
    disruptionDay: 2,
    leadTimeDays: 2,
    hypothetical: true,
  });
  expect(result.rankingCriterion).toBe('shortfall-then-cost');
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
    incrementalCostCents: null,
  });
  expect(result.rankedMitigations[0].feasible).toBe(true);
  expect(
    result.rankedMitigations
      .slice(0, 2)
      .map(({ incrementalCostCents }) => incrementalCostCents)
  ).toEqual([320, 160]);
});

test('applies the default shortfall ranking when candidates arrive out of order', () => {
  const result = planSupplyChain(
    scenario({
      mitigations: [
        { ...scenario().mitigations[1], id: 'alpha-slow' },
        { ...scenario().mitigations[0], id: 'zeta-fast' },
      ],
    })
  );

  expect(
    result.rankedMitigations.map(({ id, shortfallAvoidedUnits }) => [
      id,
      shortfallAvoidedUnits,
    ])
  ).toEqual([
    ['zeta-fast', 30],
    ['alpha-slow', 20],
  ]);
});

test('optional industry graph IDs do not change a valid plan', () => {
  const baseline = planSupplyChain(scenario());
  const withReferences = planSupplyChain(
    scenario({
      industryGraphReferences: {
        organizations: ['org:customer-7'],
        offerings: ['offering:grain'],
        processes: ['process:wholesale'],
        inputs: ['input:grain'],
        outputs: ['output:flour'],
        relationships: ['relation:customer-supply'],
      },
    })
  );
  expect(withReferences).toEqual(baseline);
});

test('allows sparse optional graph references without adding missing kinds', () => {
  const result = planSupplyChain(
    scenario({
      industryGraphReferences: { organizations: ['org:known'] },
    })
  );

  expect(result.error).toBeUndefined();
  expect(result).toEqual(planSupplyChain(scenario()));
});

test('validates IDs in every optional graph reference kind', () => {
  for (const kind of [
    'organizations',
    'offerings',
    'processes',
    'inputs',
    'outputs',
    'relationships',
  ]) {
    const result = planSupplyChain(
      scenario({ industryGraphReferences: { [kind]: [7] } })
    );

    expect(result).toMatchObject({ error: 'invalid-input' });
    expect(result.issues.join(' ')).toContain(
      `Industry graph ${kind}[0] must be a non-empty ID`
    );
  }
});

test('recovers route capacity after the disruption duration ends', () => {
  const result = planSupplyChain(
    scenario({
      disruption: { ...scenario().disruption, durationDays: 2 },
      mitigations: [],
    })
  );
  expect(result.baseline).toMatchObject({
    firstShortfallDay: 3,
    totalShortfallUnits: 10,
    totalCostCents: 150,
  });
});

test('models one-time buffer arrival, cost, capacity, and selectable ranking criteria', () => {
  const mitigationOptions = [
    {
      id: 'alternate-route',
      kind: 'capacity',
      routeId: 'north-lane',
      capacityUnitsPerDay: 10,
      leadTimeDays: 2,
      unitCostCents: 8,
    },
    {
      id: 'buffer-stock',
      kind: 'buffer',
      bufferUnits: 10,
      leadTimeDays: 2,
      unitCostCents: 1,
    },
  ];
  const serviceFirst = planSupplyChain(
    scenario({ mitigations: mitigationOptions })
  );
  expect(serviceFirst.rankedMitigations.map(({ id }) => id)).toEqual([
    'alternate-route',
    'buffer-stock',
  ]);
  expect(serviceFirst.rankedMitigations[1]).toMatchObject({
    shortfallAvoidedUnits: 10,
    incrementalCostCents: 10,
  });

  const costFirst = planSupplyChain(
    scenario({
      mitigations: mitigationOptions,
      rankingCriterion: 'cost-then-shortfall',
    })
  );
  expect(costFirst.rankingCriterion).toBe('cost-then-shortfall');
  expect(costFirst.rankedMitigations.map(({ id }) => id)).toEqual([
    'buffer-stock',
    'alternate-route',
  ]);
});

test('keeps buffers larger than destination capacity visible as infeasible', () => {
  const result = planSupplyChain(
    scenario({
      destination: { ...scenario().destination, maxBufferUnits: 5 },
      mitigations: [
        {
          id: 'oversized-buffer',
          kind: 'buffer',
          bufferUnits: 6,
          leadTimeDays: 1,
          unitCostCents: 1,
        },
      ],
    })
  );
  expect(result.rankedMitigations[0]).toMatchObject({
    feasible: false,
    reason: 'exceeds-buffer-capacity',
    incrementalCostCents: null,
  });
});

test('accepts mitigation capacity and arrival exactly on their inclusive limits', () => {
  const result = planSupplyChain(
    scenario({
      horizonDays: 1,
      destination: {
        ...scenario().destination,
        startingInventoryUnits: 0,
      },
      suppliers: [{ id: 'north', capacityUnitsPerDay: 20, unit: 'units/day' }],
      routes: [
        {
          ...scenario().routes[0],
          capacityUnitsPerDay: 10,
          maxCapacityUnitsPerDay: 20,
        },
      ],
      disruption: {
        ...scenario().disruption,
        startsDay: 1,
        durationDays: 1,
        warningLeadDays: 0,
      },
      mitigations: [
        {
          ...scenario().mitigations[0],
          id: 'exact-capacity',
          capacityUnitsPerDay: 10,
          leadTimeDays: 0,
        },
      ],
    })
  );

  expect(result.rankedMitigations[0]).toMatchObject({
    id: 'exact-capacity',
    feasible: true,
    arrivalDay: 1,
    shortfallAvoidedUnits: 10,
  });
});

test('accepts a buffer exactly at the destination limit and horizon', () => {
  const result = planSupplyChain(
    scenario({
      horizonDays: 1,
      destination: {
        ...scenario().destination,
        startingInventoryUnits: 0,
        maxBufferUnits: 10,
      },
      disruption: {
        ...scenario().disruption,
        startsDay: 1,
        durationDays: 1,
        warningLeadDays: 0,
      },
      mitigations: [
        {
          id: 'exact-buffer',
          kind: 'buffer',
          bufferUnits: 10,
          leadTimeDays: 0,
          unitCostCents: 3,
        },
      ],
    })
  );

  expect(result.rankedMitigations[0]).toMatchObject({
    id: 'exact-buffer',
    feasible: true,
    arrivalDay: 1,
    shortfallAvoidedUnits: 10,
    incrementalCostCents: 30,
  });
});

test.each([
  [
    'route capacity',
    {
      suppliers: [{ id: 'north', capacityUnitsPerDay: 40, unit: 'units/day' }],
      routes: [
        {
          ...scenario().routes[0],
          capacityUnitsPerDay: 10,
          maxCapacityUnitsPerDay: 20,
        },
      ],
    },
  ],
  [
    'supplier capacity',
    {
      suppliers: [{ id: 'north', capacityUnitsPerDay: 20, unit: 'units/day' }],
      routes: [
        {
          ...scenario().routes[0],
          capacityUnitsPerDay: 10,
          maxCapacityUnitsPerDay: 30,
        },
      ],
    },
  ],
])('rejects mitigation above the remaining %s capacity', (_label, limits) => {
  const result = planSupplyChain(
    scenario({
      ...limits,
      mitigations: [
        {
          ...scenario().mitigations[0],
          id: 'over-limit',
          capacityUnitsPerDay: 11,
        },
      ],
    })
  );

  expect(result.rankedMitigations[0]).toMatchObject({
    feasible: false,
    reason: 'exceeds-available-capacity',
    incrementalCostCents: null,
  });
});

test('allows a valid one-day horizon and route capacity at supplier and route limits', () => {
  const result = planSupplyChain(
    scenario({
      horizonDays: 1,
      suppliers: [{ id: 'north', capacityUnitsPerDay: 20, unit: 'units/day' }],
      routes: [
        {
          ...scenario().routes[0],
          capacityUnitsPerDay: 20,
          maxCapacityUnitsPerDay: 20,
        },
      ],
      disruption: {
        ...scenario().disruption,
        startsDay: 1,
        durationDays: 1,
        reductionPercent: 0,
        warningLeadDays: 0,
      },
      mitigations: [],
    })
  );

  expect(result.error).toBeUndefined();
  expect(result.baseline.daily).toHaveLength(1);
});

test('sorts multiple infeasible options deterministically', () => {
  const result = planSupplyChain(
    scenario({
      mitigations: [
        {
          id: 'zeta',
          kind: 'capacity',
          routeId: 'north-lane',
          capacityUnitsPerDay: 11,
          leadTimeDays: 1,
          unitCostCents: 1,
        },
        {
          id: 'alpha',
          kind: 'capacity',
          routeId: 'north-lane',
          capacityUnitsPerDay: 12,
          leadTimeDays: 1,
          unitCostCents: 1,
        },
      ],
    })
  );
  expect(result.rankedMitigations.map(({ id }) => id)).toEqual([
    'alpha',
    'zeta',
  ]);
});

test('is deterministic and uses identifier order to break equal-score ties', () => {
  const input = scenario({
    rankingCriterion: 'cost-then-shortfall',
    mitigations: [
      {
        ...scenario().mitigations[0],
        id: 'zeta',
      },
      {
        ...scenario().mitigations[0],
        id: 'alpha',
      },
    ],
  });
  expect(planSupplyChain(input)).toEqual(planSupplyChain(input));
  expect(planSupplyChain(input).rankedMitigations.map(({ id }) => id)).toEqual([
    'alpha',
    'zeta',
  ]);
});

test('uses identifier order for equal shortfall and cost scores', () => {
  const input = scenario({
    mitigations: [
      { ...scenario().mitigations[0], id: 'zeta' },
      { ...scenario().mitigations[0], id: 'alpha' },
    ],
  });
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
  [
    'unknown ranking criterion',
    scenario({ rankingCriterion: 'random' }),
    'Ranking criterion',
  ],
  [
    'invalid industry reference object',
    scenario({ industryGraphReferences: [] }),
    'Industry graph references must be an object',
  ],
  [
    'null industry reference object',
    scenario({ industryGraphReferences: null }),
    'Industry graph references must be an object',
  ],
  [
    'primitive industry reference object',
    scenario({ industryGraphReferences: 'invalid' }),
    'Industry graph references must be an object',
  ],
  [
    'invalid industry reference collection',
    scenario({ industryGraphReferences: { organizations: 'org-1' } }),
    'organizations must be an array',
  ],
  [
    'blank industry reference ID',
    scenario({ industryGraphReferences: { inputs: [' '] } }),
    'inputs[0] must be a non-empty ID',
  ],
  [
    'non-string industry reference ID',
    scenario({ industryGraphReferences: { outputs: [7] } }),
    'outputs[0] must be a non-empty ID',
  ],
  ['missing suppliers', scenario({ suppliers: null }), 'at least one supplier'],
  [
    'null supplier record',
    scenario({ suppliers: [null] }),
    'Supplier records must be objects',
  ],
  ['missing routes', scenario({ routes: null }), 'at least one route'],
  [
    'null route record',
    scenario({ routes: [null] }),
    'Route records must be objects',
  ],
  [
    'invalid mitigations collection',
    scenario({ mitigations: null }),
    'Mitigations must be an array',
  ],
  [
    'null mitigation record',
    scenario({ mitigations: [null] }),
    'Mitigation records must be objects',
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
    'invalid route unit cost',
    scenario({ routes: [{ ...scenario().routes[0], unitCostCents: 1.5 }] }),
    'unit cost in cents must be a non-negative whole number',
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
    'zero disruption duration',
    scenario({ disruption: { ...scenario().disruption, durationDays: 0 } }),
    'Disruption duration must be at least one day',
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
    'invalid mitigation kind',
    scenario({
      mitigations: [{ ...scenario().mitigations[0], kind: 'reroute' }],
    }),
    'kind must be capacity or buffer',
  ],
  [
    'invalid mitigation unit cost',
    scenario({
      mitigations: [{ ...scenario().mitigations[0], unitCostCents: -1 }],
    }),
    'unit cost in cents',
  ],
  [
    'invalid buffer quantity',
    scenario({
      mitigations: [
        {
          id: 'bad-buffer',
          kind: 'buffer',
          bufferUnits: -1,
          leadTimeDays: 0,
          unitCostCents: 1,
        },
      ],
    }),
    'buffer units',
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

test('reports malformed records and scalar boundaries without throwing', () => {
  const invalidInputs = [
    [scenario({ suppliers: [null] }), 'Supplier records must be objects'],
    [scenario({ routes: [null] }), 'Route records must be objects'],
    [scenario({ mitigations: [null] }), 'Mitigation records must be objects'],
    [
      scenario({ destination: { ...scenario().destination, id: 7 } }),
      'destination with a valid ID',
    ],
    [
      scenario({
        destination: { ...scenario().destination, dailyDemandUnits: -1 },
      }),
      'Destination daily demand',
    ],
    [
      scenario({
        destination: {
          ...scenario().destination,
          dailyDemandUnits: Number.POSITIVE_INFINITY,
        },
      }),
      'Destination daily demand',
    ],
    [
      scenario({
        disruption: { ...scenario().disruption, reductionPercent: -1 },
      }),
      'between 0 and 100 percent',
    ],
    [
      scenario({
        disruption: {
          ...scenario().disruption,
          reductionPercent: Number.POSITIVE_INFINITY,
        },
      }),
      'between 0 and 100 percent',
    ],
  ];

  for (const [input, expectedIssue] of invalidInputs) {
    expect(() => planSupplyChain(input)).not.toThrow();
    const result = planSupplyChain(input);
    expect(result).toMatchObject({ error: 'invalid-input' });
    expect(result.issues.join(' ')).toContain(expectedIssue);
  }
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

test('resolves a disruption and mitigation among multiple routes', () => {
  const input = scenario({
    suppliers: [
      ...scenario().suppliers,
      { id: 'east', capacityUnitsPerDay: 10, unit: 'units/day' },
    ],
    routes: [
      ...scenario().routes,
      {
        id: 'east-lane',
        fromId: 'east',
        toId: 'market',
        capacityUnitsPerDay: 0,
        maxCapacityUnitsPerDay: 10,
        leadTimeDays: 0,
        unitCostCents: 7,
      },
    ],
    disruption: {
      ...scenario().disruption,
      routeId: 'east-lane',
    },
    mitigations: [
      {
        ...scenario().mitigations[0],
        id: 'east-backup',
        routeId: 'east-lane',
        capacityUnitsPerDay: 10,
      },
    ],
  });
  const result = planSupplyChain(input);

  expect(result.error).toBeUndefined();
  expect(result.rankedMitigations[0]).toMatchObject({
    id: 'east-backup',
    feasible: true,
    reason: null,
    shortfallAvoidedUnits: 0,
    incrementalCostCents: 320,
  });
  expect(result.baseline.daily[1].deliveries).toBe(10);
});

test('a candidate that arrives after the simulation horizon remains infeasible', () => {
  const result = planSupplyChain(
    scenario({
      mitigations: [
        {
          ...scenario().mitigations[0],
          id: 'too-late',
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

test('a buffer arriving after a recovered shortage cannot retroactively avoid it', () => {
  const result = planSupplyChain(
    scenario({
      destination: { ...scenario().destination, startingInventoryUnits: 0 },
      disruption: { ...scenario().disruption, durationDays: 1 },
      mitigations: [
        {
          id: 'late-buffer',
          kind: 'buffer',
          bufferUnits: 20,
          leadTimeDays: 4,
          unitCostCents: 3,
        },
      ],
    })
  );

  expect(result.baseline.totalShortfallUnits).toBe(10);
  expect(result.rankedMitigations[0]).toMatchObject({
    feasible: true,
    arrivalDay: 4,
    shortfallAvoidedUnits: 0,
    incrementalCostCents: 60,
  });
});

test('uses the matching supplier when capacities differ from the first supplier', () => {
  const result = planSupplyChain(
    scenario({
      suppliers: [
        { id: 'north', capacityUnitsPerDay: 2, unit: 'units/day' },
        { id: 'south', capacityUnitsPerDay: 20, unit: 'units/day' },
      ],
      routes: [{ ...scenario().routes[0], fromId: 'south' }],
      disruption: { ...scenario().disruption, reductionPercent: 0 },
      mitigations: [scenario().mitigations[0]],
    })
  );

  expect(result.error).toBeUndefined();
  expect(result.baseline.daily.map(({ deliveries }) => deliveries)).toEqual([
    10, 10, 10, 10, 10,
  ]);
  expect(result.rankedMitigations[0].feasible).toBe(true);
});
