/**
 * Calculate raw screening arithmetic from validated inputs.
 * @param {Record<string, number>} input Validated unit-labelled assumptions.
 * @returns {Record<string, number>} Pure energy, power, cost and threshold values.
 */
export function calculateIndustrialHeatPumpValues(input) {
  const incumbentFuelKwh =
    input.annualUsefulHeatKwh / input.incumbentEfficiency;
  const heatPumpElectricityKwh = input.annualUsefulHeatKwh / input.heatPumpCop;
  const requiredThermalPowerKw =
    input.annualUsefulHeatKwh / input.annualOperatingHours;
  const requiredElectricalPowerKw = requiredThermalPowerKw / input.heatPumpCop;
  const incumbentFuelAnnualCost =
    incumbentFuelKwh * input.incumbentFuelPricePerKwh;
  const heatPumpElectricityAnnualCost =
    heatPumpElectricityKwh * input.electricityPricePerKwh;
  const heatPumpAnnualOperatingCost =
    heatPumpElectricityAnnualCost + input.annualMaintenanceCost;
  const annualOperatingSavings =
    incumbentFuelAnnualCost - heatPumpAnnualOperatingCost;
  const allowedElectricityCost =
    incumbentFuelAnnualCost -
    input.annualMaintenanceCost -
    input.installedCost / input.targetPaybackYears;
  const values = {
    annualUsefulHeatKwh: input.annualUsefulHeatKwh,
    incumbentFuelKwh,
    heatPumpElectricityKwh,
    requiredThermalPowerKw,
    requiredElectricalPowerKw,
    incumbentFuelAnnualCost,
    heatPumpElectricityAnnualCost,
    heatPumpMaintenanceAnnualCost: input.annualMaintenanceCost,
    heatPumpAnnualOperatingCost,
    annualOperatingSavings,
    allowedElectricityCost,
    simplePaybackYears: input.installedCost / annualOperatingSavings,
    minimumCopForTargetPayback:
      (input.annualUsefulHeatKwh * input.electricityPricePerKwh) /
      allowedElectricityCost,
    maximumInstalledCostForTargetPayback:
      annualOperatingSavings * input.targetPaybackYears,
  };
  return values;
}
