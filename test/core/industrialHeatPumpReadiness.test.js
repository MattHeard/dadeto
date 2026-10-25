import { calculateIndustrialHeatPumpReadiness } from '../../src/browser/industrialHeatPumpReadiness.js';
import { INDUSTRIAL_HEAT_PUMP_FIXTURE } from '../fixtures/industrialHeatPumpReadiness.js';

const calculate = (overrides = {}) =>
  calculateIndustrialHeatPumpReadiness({
    ...INDUSTRIAL_HEAT_PUMP_FIXTURE,
    ...overrides,
  });

describe('industrial heat-pump screening calculation', () => {
  test('matches the hand-worked illustrative food-processing case', () => {
    const result = calculate();

    expect(result.valid).toBe(true);
    expect(result.comparison).toMatchObject({
      annualUsefulHeatKwh: 480000,
      incumbentFuelKwh: 480000 / 0.85,
      heatPumpElectricityKwh: 240000,
      requiredThermalPowerKw: 80,
      requiredElectricalPowerKw: 40,
      annualCosts: {
        incumbentFuel: (480000 / 0.85) * 0.12,
        heatPumpElectricity: 43200,
        heatPumpMaintenance: 4000,
        heatPumpTotal: 47200,
      },
      annualOperatingSavings: (480000 / 0.85) * 0.12 - 47200,
      simplePayback: {
        status: 'available',
        years: 150000 / ((480000 / 0.85) * 0.12 - 47200),
      },
      feasibility: {
        temperature: {
          status: 'within-limit',
          requiredC: 120,
          supportedMaximumC: 130,
        },
        electricalPower: {
          status: 'within-limit',
          requiredKw: 40,
          availableKw: 60,
        },
        economics: { status: 'positive-operating-savings' },
        targetPayback: { status: 'exceeds-target', targetYears: 5 },
      },
      thresholds: {
        minimumCopForTargetPayback: expect.objectContaining({
          status: 'available',
        }),
        maximumInstalledCostForTargetPayback: expect.objectContaining({
          status: 'available',
        }),
      },
    });
    expect(
      result.comparison.thresholds.minimumCopForTargetPayback.value
    ).toBeCloseTo(2.558, 2);
    expect(
      result.comparison.thresholds.maximumInstalledCostForTargetPayback.value
    ).toBeCloseTo(102823.529, 2);
    expect(result.comparison.disclosure).toMatch(
      /hypothetical screening calculation/i
    );
  });

  test.each([null, undefined, [], 'fixture'])(
    'rejects non-object input %p',
    input => {
      expect(calculateIndustrialHeatPumpReadiness(input)).toEqual({
        valid: false,
        errors: [{ field: 'input', code: 'object-required' }],
      });
    }
  );

  test('reports all required values when the input object is empty', () => {
    const result = calculateIndustrialHeatPumpReadiness({});
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(12);
    expect(result.errors.every(error => error.code === 'required')).toBe(true);
  });

  test.each([
    ['annualUsefulHeatKwh', -1, 'below-minimum'],
    ['annualUsefulHeatKwh', 0, 'below-minimum'],
    ['annualOperatingHours', 0, 'below-minimum'],
    ['annualOperatingHours', 8761, 'above-maximum'],
    ['incumbentEfficiency', 0, 'below-minimum'],
    ['incumbentEfficiency', 1.01, 'above-maximum'],
    ['heatPumpCop', 0, 'below-minimum'],
    ['requiredSupplyTemperatureC', -1, 'below-minimum'],
    ['requiredSupplyTemperatureC', 301, 'above-maximum'],
    ['heatPumpMaxTemperatureC', 301, 'above-maximum'],
    ['targetPaybackYears', 0, 'below-minimum'],
  ])('rejects invalid %s=%s with %s', (field, value, code) => {
    expect(calculate({ [field]: value })).toMatchObject({
      valid: false,
      errors: [expect.objectContaining({ field, code })],
    });
  });

  test.each([
    ['requiredSupplyTemperatureC', undefined],
    ['annualUsefulHeatKwh', '480000'],
    ['annualOperatingHours', NaN],
    ['incumbentFuelPricePerKwh', Infinity],
    ['incumbentEfficiency', null],
    ['electricityPricePerKwh', -Infinity],
    ['heatPumpCop', undefined],
    ['heatPumpMaxTemperatureC', '130'],
    ['installedCost', NaN],
    ['annualMaintenanceCost', null],
    ['availableElectricalPowerKw', Infinity],
    ['targetPaybackYears', '5'],
  ])('rejects non-finite or non-number %s', (field, value) => {
    expect(calculate({ [field]: value })).toMatchObject({
      valid: false,
      errors: [
        expect.objectContaining({ field, code: 'finite-number-required' }),
      ],
    });
  });

  test.each([
    ['incumbentFuelPricePerKwh', -0.01],
    ['electricityPricePerKwh', -0.01],
    ['heatPumpMaxTemperatureC', -1],
    ['installedCost', -1],
    ['annualMaintenanceCost', -1],
    ['availableElectricalPowerKw', -1],
  ])('rejects negative %s', (field, value) => {
    expect(calculate({ [field]: value })).toMatchObject({
      valid: false,
      errors: [expect.objectContaining({ field, code: 'below-minimum' })],
    });
  });

  test('reports an operating-efficiency and temperature-limit excess independently', () => {
    const result = calculate({
      requiredSupplyTemperatureC: 140,
      heatPumpMaxTemperatureC: 100,
      availableElectricalPowerKw: 30,
    });
    expect(result.comparison.feasibility).toMatchObject({
      temperature: { status: 'above-heat-pump-limit' },
      electricalPower: { status: 'insufficient-site-capacity' },
      economics: { status: 'positive-operating-savings' },
    });
  });

  test('marks payback not applicable and thresholds not achievable when savings are nonpositive', () => {
    const result = calculate({
      incumbentFuelPricePerKwh: 0,
      electricityPricePerKwh: 0.18,
      annualMaintenanceCost: 4000,
    });
    expect(result.comparison.annualOperatingSavings).toBeLessThanOrEqual(0);
    expect(result.comparison.simplePayback).toEqual({
      status: 'not-applicable',
    });
    expect(result.comparison.feasibility).toMatchObject({
      economics: { status: 'no-positive-operating-savings' },
      targetPayback: { status: 'not-applicable' },
    });
    expect(result.comparison.thresholds).toEqual({
      minimumCopForTargetPayback: { status: 'not-achievable' },
      maximumInstalledCostForTargetPayback: { status: 'not-achievable' },
    });
  });

  test('allows zero-valued tariffs and costs and reports a zero-cost power shortfall independently', () => {
    const result = calculate({
      requiredSupplyTemperatureC: 0,
      incumbentFuelPricePerKwh: 0,
      electricityPricePerKwh: 0,
      installedCost: 0,
      annualMaintenanceCost: 0,
      availableElectricalPowerKw: 0,
      heatPumpMaxTemperatureC: 0,
    });
    expect(result.valid).toBe(true);
    expect(result.comparison.simplePayback).toEqual({
      status: 'not-applicable',
    });
    expect(result.comparison.feasibility).toMatchObject({
      temperature: { status: 'within-limit' },
      electricalPower: { status: 'insufficient-site-capacity' },
    });
  });

  test.each([
    { annualUsefulHeatKwh: 1e308, incumbentEfficiency: 0.01 },
    { heatPumpCop: Number.MIN_VALUE },
    { annualOperatingHours: Number.MIN_VALUE },
    { targetPaybackYears: Number.MAX_VALUE, heatPumpCop: 3 },
  ])(
    'rejects finite assumptions that overflow displayed arithmetic: %p',
    overrides => {
      expect(calculate(overrides)).toEqual({
        valid: false,
        errors: [{ field: 'input', code: 'calculation-not-finite' }],
      });
    }
  );

  test('reports target payback when savings meet it exactly', () => {
    const savings = calculate().comparison.annualOperatingSavings;
    const result = calculate({ installedCost: savings * 5 });
    expect(result.comparison.feasibility.targetPayback).toEqual({
      status: 'meets-target',
      targetYears: 5,
    });
  });
});
