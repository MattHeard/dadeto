# Industrial Heat-pump Retrofit Readiness — Field Guide

## What this toy does

Open the standalone tool at
`/industrial-heat-pump-readiness/`. It compares an illustrative food-process
heat demand with a hypothetical heat-pump scenario using only the assumptions
shown on the page. It runs in your browser without an account or service.
The result is a screening aid; it does not establish equipment availability,
site suitability, or a design.

## Input

All annual energy values use kWh/year, power uses kW, temperatures use °C,
efficiency and COP are unitless, and prices/costs use euros. Edit any input to
recalculate immediately. The scenario selector provides a conservative case,
the base example, and an improved assumed COP/temperature case. These are
sensitivity assumptions, not commercially validated equipment combinations.
The base synthetic fixture is:

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
`src/core/industrialHeatPumpReadiness.js`. The interactive presenter and
scenario presets are in `src/core/browser/industrialHeatPump/`; a small
`src/browser/` adapter supplies the calculation and local browser effects.

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

The page reports incumbent fuel consumption and cost, heat-pump electricity
and cost, average thermal and electrical power, savings, simple payback,
separate temperature/power/economic feasibility, and COP/installed-cost
thresholds. Invalid values show field-specific errors and hide stale results.
If annual operating savings are not positive, payback is marked not applicable.

The vendor discussion brief summarizes the current user assumptions, lists
measurements to confirm, and suggests commissioning questions. **Export
scenario JSON** downloads the current assumptions, results, and caveat.
**Print brief** opens the browser's print flow. Neither action sends data to a
server.

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

## Local preview

Run `npm run build`, then serve the generated static site with
`npm start -- --listen 4173` and open
`http://localhost:4173/industrial-heat-pump-readiness/`. The presenter tests are
in `test/browser/industrialHeatPumpPage.test.js`.
