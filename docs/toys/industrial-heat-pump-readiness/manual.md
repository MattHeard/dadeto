# Industrial Heat-pump Retrofit Readiness — Field Guide

## What this toy does

This first slice is a deterministic calculation module, not an interactive
page. It compares an illustrative food-processing heat demand with a
hypothetical heat-pump scenario using only explicit assumptions supplied by
the caller. The calculation does not establish equipment availability or
suitability.

## Input

All annual energy values use kWh/year, power uses kW, temperatures use °C,
efficiency and COP are unitless, and prices/costs must use one consistent
currency. The synthetic fixture is:

### Example

```json
{
  "requiredSupplyTemperatureC": 120,
  "annualUsefulHeatKwh": 480000,
  "annualOperatingHours": 6000,
  "incumbentFuelPricePerKwh": 0.12,
  "incumbentEfficiency": 0.85,
  "electricityPricePerKwh": 0.18,
  "heatPumpCop": 2,
  "heatPumpMaxTemperatureC": 130,
  "installedCost": 150000,
  "annualMaintenanceCost": 4000,
  "availableElectricalPowerKw": 60,
  "targetPaybackYears": 5
}
```

### Schema

The input boundary is `calculateIndustrialHeatPumpReadiness` in
`src/browser/industrialHeatPumpReadiness.js`; its pure arithmetic is in
`src/core/industrialHeatPumpReadiness.js`.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "required": ["requiredSupplyTemperatureC", "annualUsefulHeatKwh", "annualOperatingHours", "incumbentFuelPricePerKwh", "incumbentEfficiency", "electricityPricePerKwh", "heatPumpCop", "heatPumpMaxTemperatureC", "installedCost", "annualMaintenanceCost", "availableElectricalPowerKw", "targetPaybackYears"],
  "properties": {
    "requiredSupplyTemperatureC": { "type": "number", "minimum": 0, "maximum": 300 },
    "annualUsefulHeatKwh": { "type": "number", "exclusiveMinimum": 0 },
    "annualOperatingHours": { "type": "number", "exclusiveMinimum": 0, "maximum": 8760 },
    "incumbentFuelPricePerKwh": { "type": "number", "minimum": 0 },
    "incumbentEfficiency": { "type": "number", "exclusiveMinimum": 0, "maximum": 1 },
    "electricityPricePerKwh": { "type": "number", "minimum": 0 },
    "heatPumpCop": { "type": "number", "exclusiveMinimum": 0 },
    "heatPumpMaxTemperatureC": { "type": "number", "minimum": 0, "maximum": 300 },
    "installedCost": { "type": "number", "minimum": 0 },
    "annualMaintenanceCost": { "type": "number", "minimum": 0 },
    "availableElectricalPowerKw": { "type": "number", "minimum": 0 },
    "targetPaybackYears": { "type": "number", "exclusiveMinimum": 0 }
  }
}
```

## Output

The calculator reports incumbent fuel consumption and cost, heat-pump
electricity and cost, average thermal and electrical power, savings, simple
payback, separate temperature/power/economic feasibility, and COP/installed
cost thresholds. Invalid values return explicit field-specific errors.

### Example

```json
{
  "annualUsefulHeatKwh": 480000,
  "incumbentFuelKwh": 564705.8823529412,
  "heatPumpElectricityKwh": 240000,
  "requiredThermalPowerKw": 80,
  "requiredElectricalPowerKw": 40,
  "annualCosts": {
    "incumbentFuel": 67764.70588235294,
    "heatPumpElectricity": 43200,
    "heatPumpMaintenance": 4000,
    "heatPumpTotal": 47200
  },
  "annualOperatingSavings": 20564.70588235294,
  "simplePayback": { "status": "available", "years": 7.294527363184081 }
}
```

## Behavior

The calculation uses useful heat divided by incumbent efficiency or
hypothetical COP; average power is annual energy divided by operating hours.
Payback is available only for positive operating savings. A required
temperature beyond the assumed equipment limit, insufficient site electrical
capacity, and unattractive economics are independent statuses.

## Limits and assumptions

The fixture is illustrative. The model does not estimate thermodynamic COP,
part-load performance, peak demand, equipment sizing, financing, replacement,
carbon impact, or commercial equipment availability. It is not engineering,
procurement, or investment advice.
