/** @type {Readonly<Record<string, number>>} Illustrative food-processing case. */
export const INDUSTRIAL_HEAT_PUMP_FIXTURE = Object.freeze({
  requiredSupplyTemperatureC: 120,
  annualUsefulHeatKwh: 480000,
  annualOperatingHours: 6000,
  incumbentFuelPricePerKwh: 0.12,
  incumbentEfficiency: 0.85,
  electricityPricePerKwh: 0.18,
  heatPumpCop: 2,
  heatPumpMaxTemperatureC: 130,
  installedCost: 150000,
  annualMaintenanceCost: 4000,
  availableElectricalPowerKw: 60,
  targetPaybackYears: 5,
});
