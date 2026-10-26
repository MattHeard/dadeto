import {
  compareRoverScenarios,
  estimateRoverFeasibility,
  maximumBreakEvenOperatingCost,
  minimumBreakEvenCoverage,
  validateRoverInput,
} from '../../../../src/core/browser/game/agricultural-rover/agricultural-rover.js';

/**
 * Build a deterministic one-hectare example.
 * @param {object} [overrides] Top-level scenario fields to replace.
 * @returns {object} Complete unit-explicit scenario.
 */
function scenario(overrides = {}) {
  return {
    jobType: 'weeding',
    areaSquareMeters: 10_000,
    operatingWindowMinutes: 480,
    baseline: {
      laborHoursPerHectare: 10,
      hourlyCostCents: 2_500,
      evidence: 'observed',
    },
    rover: {
      machineCount: 2,
      effectiveCoverageSquareMetersPerHour: 5_000,
      batteryRuntimeMinutes: 60,
      chargeMinutes: 30,
      downtimePercent: 20,
      supervisionHoursPerMachineHour: 0.25,
      interventionsPerMachineHour: 0.5,
      interventionMinutes: 15,
      operatorHourlyCostCents: 3_000,
      operatingCostCentsPerMachineHour: 1_000,
      upfrontCostCents: 200_000,
      comparableJobs: 100,
    },
    ...overrides,
  };
}

test('estimates capacity, labor, whole-cent cost and capital break-even from the hand example', () => {
  expect(estimateRoverFeasibility(scenario())).toEqual({
    machineHours: 2,
    elapsedHours: 1.875,
    windowUtilizationPercent: 23.4375,
    fitsOperatingWindow: true,
    coveredAreaSquareMeters: 10_000,
    interventionCount: 1,
    operatorHours: 0.75,
    manualLaborHours: 10,
    manualCostCents: 25_000,
    roverVariableCostCents: 4_250,
    roverAllInJobCostCents: 6_250,
    capitalCostPerJobCents: 2_000,
    savingsBeforeCapitalCents: 20_750,
    netSavingsAfterCapitalCents: 18_750,
    breakEvenJobs: 10,
  });
});

test('labels three deterministic sensitivity scenarios and moves key outputs in expected directions', () => {
  const result = compareRoverScenarios(scenario());
  expect(Object.keys(result)).toEqual(['conservative', 'base', 'optimistic']);
  expect(result.conservative.elapsedHours).toBeGreaterThan(
    result.base.elapsedHours
  );
  expect(result.optimistic.elapsedHours).toBeLessThan(result.base.elapsedHours);
  expect(result.conservative.roverVariableCostCents).toBeGreaterThan(
    result.base.roverVariableCostCents
  );
  expect(result.optimistic.roverVariableCostCents).toBeLessThan(
    result.base.roverVariableCostCents
  );
  expect(result.conservative.fitsOperatingWindow).toBe(true);
  expect(scenario().rover.effectiveCoverageSquareMetersPerHour).toBe(5_000);
});

test('a wider fleet improves elapsed time without pretending to reduce total machine-hours', () => {
  const single = estimateRoverFeasibility({
    ...scenario(),
    rover: { ...scenario().rover, machineCount: 1 },
  });
  const pair = estimateRoverFeasibility(scenario());
  expect(pair.elapsedHours).toBeLessThan(single.elapsedHours);
  expect(pair.machineHours).toBe(single.machineHours);
  expect(pair.fitsOperatingWindow).toBe(true);
});

test('downtime reduces achievable coverage and can break the operating window', () => {
  const estimate = estimateRoverFeasibility({
    ...scenario(),
    operatingWindowMinutes: 100,
    rover: { ...scenario().rover, downtimePercent: 50 },
  });
  expect(estimate.coveredAreaSquareMeters).toBeLessThan(10_000);
  expect(estimate.fitsOperatingWindow).toBe(false);
  expect(estimate.windowUtilizationPercent).toBeGreaterThan(100);
});

test('supervision cost raises rover cost while retaining explicit cent rounding', () => {
  const low = estimateRoverFeasibility(scenario());
  const high = estimateRoverFeasibility({
    ...scenario(),
    rover: { ...scenario().rover, operatorHourlyCostCents: 6_000 },
  });
  expect(high.roverVariableCostCents).toBeGreaterThan(
    low.roverVariableCostCents
  );
  expect(Number.isInteger(high.roverVariableCostCents)).toBe(true);
});

test('break-even thresholds are explicit and return null when labor alone already loses', () => {
  expect(minimumBreakEvenCoverage(scenario())).toBeLessThan(5_000);
  expect(maximumBreakEvenOperatingCost(scenario())).toBeGreaterThan(0);
  const impossible = scenario({
    baseline: {
      laborHoursPerHectare: 0,
      hourlyCostCents: 0,
      evidence: 'assumed',
    },
  });
  expect(minimumBreakEvenCoverage(impossible)).toBeNull();
  expect(maximumBreakEvenOperatingCost(impossible)).toBeNull();
  expect(estimateRoverFeasibility(impossible).breakEvenJobs).toBeNull();
});

test('accepts optional baseline entity identifiers without requiring an industry graph', () => {
  expect(
    validateRoverInput(
      scenario({
        baselineReferences: {
          sector: 'agriculture',
          process: 'manual-weeding',
        },
      })
    )
  ).toEqual([]);
  expect(validateRoverInput(scenario({ baselineReferences: {} }))).toEqual([]);
});

test('all public calculations return explicit validation errors for invalid scenarios', () => {
  const invalid = scenario({ areaSquareMeters: 0 });
  expect(compareRoverScenarios(invalid)).toMatchObject({
    error: 'invalid-input',
  });
  expect(minimumBreakEvenCoverage(invalid)).toMatchObject({
    error: 'invalid-input',
  });
  expect(maximumBreakEvenOperatingCost(invalid)).toMatchObject({
    error: 'invalid-input',
  });
});

test.each([
  ['missing input', null],
  ['array input', []],
  ['unsupported job', scenario({ jobType: 'harvesting' })],
  ['zero field', scenario({ areaSquareMeters: 0 })],
  ['non-finite field', scenario({ areaSquareMeters: Infinity })],
  ['zero window', scenario({ operatingWindowMinutes: 0 })],
  ['missing baseline', scenario({ baseline: null })],
  [
    'negative baseline labor',
    scenario({
      baseline: { ...scenario().baseline, laborHoursPerHectare: -1 },
    }),
  ],
  [
    'invalid baseline evidence',
    scenario({
      baseline: { ...scenario().baseline, evidence: 'vendor-claim' },
    }),
  ],
  ['missing rover', scenario({ rover: null })],
  ['zero fleet', scenario({ rover: { ...scenario().rover, machineCount: 0 } })],
  [
    'fractional fleet',
    scenario({ rover: { ...scenario().rover, machineCount: 1.5 } }),
  ],
  [
    'zero throughput',
    scenario({
      rover: { ...scenario().rover, effectiveCoverageSquareMetersPerHour: 0 },
    }),
  ],
  [
    'zero runtime',
    scenario({ rover: { ...scenario().rover, batteryRuntimeMinutes: 0 } }),
  ],
  [
    'negative charging',
    scenario({ rover: { ...scenario().rover, chargeMinutes: -1 } }),
  ],
  [
    'negative downtime',
    scenario({ rover: { ...scenario().rover, downtimePercent: -1 } }),
  ],
  [
    'no uptime',
    scenario({ rover: { ...scenario().rover, downtimePercent: 100 } }),
  ],
  [
    'negative supervision',
    scenario({
      rover: { ...scenario().rover, supervisionHoursPerMachineHour: -1 },
    }),
  ],
  [
    'negative intervention rate',
    scenario({
      rover: { ...scenario().rover, interventionsPerMachineHour: -1 },
    }),
  ],
  [
    'negative intervention time',
    scenario({ rover: { ...scenario().rover, interventionMinutes: -1 } }),
  ],
  [
    'negative labor rate',
    scenario({ rover: { ...scenario().rover, operatorHourlyCostCents: -1 } }),
  ],
  [
    'negative operation cost',
    scenario({
      rover: { ...scenario().rover, operatingCostCentsPerMachineHour: -1 },
    }),
  ],
  [
    'negative purchase price',
    scenario({ rover: { ...scenario().rover, upfrontCostCents: -1 } }),
  ],
  [
    'fractional comparison jobs',
    scenario({ rover: { ...scenario().rover, comparableJobs: 1.5 } }),
  ],
  [
    'unsupported baseline reference',
    scenario({ baselineReferences: { region: 'west' } }),
  ],
  [
    'non-string baseline reference',
    scenario({ baselineReferences: { process: 3 } }),
  ],
  ['array baseline reference', scenario({ baselineReferences: [] })],
])(
  'rejects %s with an explicit error rather than estimating',
  (_label, input) => {
    expect(estimateRoverFeasibility(input)).toMatchObject({
      error: 'invalid-input',
      issues: expect.any(Array),
    });
  }
);

test('leaves supplied assumptions unchanged during estimation and sensitivity analysis', () => {
  const input = scenario();
  const before = structuredClone(input);
  estimateRoverFeasibility(input);
  compareRoverScenarios(input);
  expect(input).toEqual(before);
});

test.each([
  ['areaSquareMeters', 'Area in square metres', 'positive'],
  ['operatingWindowMinutes', 'Operating window in minutes', 'positive'],
  [
    'baseline.laborHoursPerHectare',
    'Baseline labor hours per hectare',
    'nonnegative',
  ],
  [
    'baseline.hourlyCostCents',
    'Baseline hourly labor cost in cents',
    'nonnegative',
  ],
  ['rover.machineCount', 'Rover count', 'integer'],
  [
    'rover.effectiveCoverageSquareMetersPerHour',
    'Effective coverage in square metres per rover-hour',
    'positive',
  ],
  ['rover.batteryRuntimeMinutes', 'Battery runtime in minutes', 'positive'],
  ['rover.chargeMinutes', 'Charge time in minutes', 'nonnegative'],
  ['rover.downtimePercent', 'Downtime percent', 'percent'],
  [
    'rover.supervisionHoursPerMachineHour',
    'Supervision worker-hours per rover-hour',
    'nonnegative',
  ],
  [
    'rover.interventionsPerMachineHour',
    'Interventions per rover-hour',
    'nonnegative',
  ],
  ['rover.interventionMinutes', 'Intervention minutes', 'nonnegative'],
  [
    'rover.operatorHourlyCostCents',
    'Operator hourly cost in cents',
    'nonnegative',
  ],
  [
    'rover.operatingCostCentsPerMachineHour',
    'Operating cost in cents per rover-hour',
    'nonnegative',
  ],
  ['rover.upfrontCostCents', 'Upfront cost in cents', 'nonnegative'],
  ['rover.comparableJobs', 'Comparable jobs', 'integer'],
])('validation names %s and its unit/range', (path, label, range) => {
  const input = scenario();
  const parts = path.split('.');
  const parent = parts.length === 1 ? input : input[parts[0]];
  const field = parts.at(-1);
  const suffix = {
    positive: 'must be greater than zero.',
    nonnegative: 'must be zero or greater.',
    integer: 'must be a positive whole number.',
    percent: 'must be at least zero and less than 100.',
  }[range];
  for (const invalid of [-1, NaN, Infinity]) {
    parent[field] = invalid;
    expect(validateRoverInput(input)).toEqual([`${label} ${suffix}`]);
  }
  parent[field] = range === 'positive' || range === 'integer' ? 1 : 0;
  expect(validateRoverInput(input)).toEqual([]);
});

test('invalid shapes and identifiers retain actionable errors', () => {
  expect(validateRoverInput('weeding')).toEqual(['Provide a scenario object.']);
  expect(validateRoverInput(scenario({ baseline: 3 }))).toEqual([
    'Provide baseline labor assumptions.',
  ]);
  expect(validateRoverInput(scenario({ rover: 3 }))).toEqual([
    'Provide hypothetical rover assumptions.',
  ]);
  expect(validateRoverInput(scenario({ jobType: 'harvesting' }))).toEqual([
    'Job type must be weeding.',
  ]);
  expect(
    validateRoverInput(
      scenario({ baseline: { ...scenario().baseline, evidence: 'claimed' } })
    )
  ).toEqual(['Baseline evidence must be observed or assumed.']);
  for (const references of [null, 3, []]) {
    expect(
      validateRoverInput(scenario({ baselineReferences: references }))
    ).toEqual(['Baseline references must be a field-to-id object.']);
  }
  expect(
    validateRoverInput(scenario({ baselineReferences: { region: 'west' } }))
  ).toEqual([
    'Baseline reference region must be an optional supported identifier.',
  ]);
  expect(
    validateRoverInput(
      scenario({
        baselineReferences: {
          sector: 's',
          subsector: 'ss',
          organization: 'o',
          offering: 'of',
          process: 'p',
          input: 'i',
          output: 'out',
        },
      })
    )
  ).toEqual([]);
});

test.each([
  [
    'conservative',
    {
      effectiveCoverageSquareMetersPerHour: 3750,
      downtimePercent: 30,
      interventionsPerMachineHour: 0.625,
      operatingCostCentsPerMachineHour: 1150,
      supervisionHoursPerMachineHour: 0.3125,
    },
  ],
  ['base', {}],
  [
    'optimistic',
    {
      effectiveCoverageSquareMetersPerHour: 6250,
      downtimePercent: 10,
      interventionsPerMachineHour: 0.375,
      operatingCostCentsPerMachineHour: 850,
      supervisionHoursPerMachineHour: 0.1875,
    },
  ],
])(
  '%s sensitivity adjusts every cost and capacity assumption',
  (name, assumptions) => {
    expect(compareRoverScenarios(scenario())[name]).toEqual(
      estimateRoverFeasibility(
        scenario({
          rover: { ...scenario().rover, ...assumptions },
        })
      )
    );
  }
);

test.each([
  [
    0,
    'optimistic',
    {
      downtimePercent: 0,
      effectiveCoverageSquareMetersPerHour: 6250,
      interventionsPerMachineHour: 0.375,
      operatingCostCentsPerMachineHour: 850,
      supervisionHoursPerMachineHour: 0.1875,
    },
  ],
  [
    99.95,
    'conservative',
    {
      downtimePercent: 99.9,
      effectiveCoverageSquareMetersPerHour: 3750,
      interventionsPerMachineHour: 0.625,
      operatingCostCentsPerMachineHour: 1150,
      supervisionHoursPerMachineHour: 0.3125,
    },
  ],
])(
  'sensitivity clamps downtime %s at the valid boundary',
  (downtime, name, assumptions) => {
    const input = scenario({
      rover: { ...scenario().rover, downtimePercent: downtime },
    });
    expect(compareRoverScenarios(input)[name]).toEqual(
      estimateRoverFeasibility(
        scenario({
          rover: {
            ...input.rover,
            ...assumptions,
          },
        })
      )
    );
  }
);

test('break-even coverage brackets the strict rounded-cent saving boundary', () => {
  const input = scenario();
  const threshold = minimumBreakEvenCoverage(input);
  expect(threshold).toBeGreaterThan(0);
  const at = coverage =>
    estimateRoverFeasibility(
      scenario({
        rover: {
          ...input.rover,
          effectiveCoverageSquareMetersPerHour: coverage,
        },
      })
    );
  expect(at(threshold).roverVariableCostCents).toBeLessThan(25_000);
  expect(
    at(threshold * 0.999999).roverVariableCostCents
  ).toBeGreaterThanOrEqual(25_000);
  expect(
    minimumBreakEvenCoverage(
      scenario({
        rover: {
          ...input.rover,
          effectiveCoverageSquareMetersPerHour: 0.0000001,
        },
      })
    )
  ).toBeCloseTo(threshold, 6);
  expect(
    minimumBreakEvenCoverage(
      scenario({
        baseline: {
          ...input.baseline,
          laborHoursPerHectare: 0.3,
        },
      })
    )
  ).toBeNull();
});

test('operating-cost parity subtracts supervision and divides by total rover-hours', () => {
  expect(maximumBreakEvenOperatingCost(scenario())).toBe(11375);
  expect(
    maximumBreakEvenOperatingCost(
      scenario({
        baseline: {
          ...scenario().baseline,
          laborHoursPerHectare: 0.9,
        },
      })
    )
  ).toBe(0);
});

test('finite-window coverage accounts for parallel rovers and admits an exact fit', () => {
  const input = scenario({ operatingWindowMinutes: 60 });
  expect(estimateRoverFeasibility(input).coveredAreaSquareMeters).toBeCloseTo(
    5333.333333333333,
    8
  );
  expect(
    estimateRoverFeasibility(scenario({ operatingWindowMinutes: 112.5 }))
      .fitsOperatingWindow
  ).toBe(true);
  expect(
    estimateRoverFeasibility(
      scenario({
        baseline: {
          ...input.baseline,
          hourlyCostCents: 425,
        },
      })
    ).breakEvenJobs
  ).toBeNull();
});
