# Agricultural Rover — Field Guide

## What this toy does

Open [/agricultural-rover/](/agricultural-rover/) to compare a hypothetical autonomous weeding fleet with your current manual process. The page starts with a synthetic example; edit any field and choose **Update comparison**. Baseline inputs are marked assumed unless changed to observed. The model does not predict agronomic success or represent a real rover vendor's performance.

## Input

The page collects area in square metres, available time in hours, operating durations in minutes, and money in euros. The model and downloaded brief store time in the explicit units shown by each property and money in integer cents. A representative one-hectare scenario is:

### Example

```json
{
  "jobType": "weeding",
  "areaSquareMeters": 10000,
  "operatingWindowMinutes": 480,
  "baseline": {
    "laborHoursPerHectare": 10,
    "hourlyCostCents": 2500,
    "evidence": "observed"
  },
  "rover": {
    "machineCount": 2,
    "effectiveCoverageSquareMetersPerHour": 5000,
    "batteryRuntimeMinutes": 60,
    "chargeMinutes": 30,
    "downtimePercent": 20,
    "supervisionHoursPerMachineHour": 0.25,
    "interventionsPerMachineHour": 0.5,
    "interventionMinutes": 15,
    "operatorHourlyCostCents": 3000,
    "operatingCostCentsPerMachineHour": 1000,
    "upfrontCostCents": 200000,
    "comparableJobs": 100
  }
}
```

If a field is omitted, the model returns an explicit validation issue rather than guessing. Baseline evidence must be `observed` or `assumed`.

### Schema

The model source is `src/core/browser/game/agricultural-rover/agricultural-rover.js`; the JSON input boundary contains nested assumptions for the existing manual process and hypothetical rover fleet.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "required": ["jobType", "areaSquareMeters", "operatingWindowMinutes", "baseline", "rover"],
  "properties": {
    "jobType": { "type": "string", "const": "weeding" },
    "areaSquareMeters": { "type": "number", "exclusiveMinimum": 0 },
    "operatingWindowMinutes": { "type": "number", "exclusiveMinimum": 0 },
    "baseline": {
      "type": "object",
      "required": ["laborHoursPerHectare", "hourlyCostCents", "evidence"],
      "properties": {
        "laborHoursPerHectare": { "type": "number", "minimum": 0 },
        "hourlyCostCents": { "type": "number", "minimum": 0 },
        "evidence": { "type": "string", "enum": ["observed", "assumed"] }
      }
    },
    "rover": {
      "type": "object",
      "required": ["machineCount", "effectiveCoverageSquareMetersPerHour", "batteryRuntimeMinutes", "chargeMinutes", "downtimePercent", "supervisionHoursPerMachineHour", "interventionsPerMachineHour", "interventionMinutes", "operatorHourlyCostCents", "operatingCostCentsPerMachineHour", "upfrontCostCents", "comparableJobs"],
      "properties": {
        "machineCount": { "type": "integer", "minimum": 1 },
        "effectiveCoverageSquareMetersPerHour": { "type": "number", "exclusiveMinimum": 0 },
        "batteryRuntimeMinutes": { "type": "number", "exclusiveMinimum": 0 },
        "chargeMinutes": { "type": "number", "minimum": 0 },
        "downtimePercent": { "type": "number", "minimum": 0, "exclusiveMaximum": 100 },
        "supervisionHoursPerMachineHour": { "type": "number", "minimum": 0 },
        "interventionsPerMachineHour": { "type": "number", "minimum": 0 },
        "interventionMinutes": { "type": "number", "minimum": 0 },
        "operatorHourlyCostCents": { "type": "number", "minimum": 0 },
        "operatingCostCentsPerMachineHour": { "type": "number", "minimum": 0 },
        "upfrontCostCents": { "type": "number", "minimum": 0 },
        "comparableJobs": { "type": "integer", "minimum": 1 }
      }
    }
  }
}
```

## Exact property names

The scenario's top-level fields are `jobType`, `areaSquareMeters`, `operatingWindowMinutes`, `baseline`, `rover`, and optional `baselineReferences`. The nested property names are shown in the schema. Optional references may use `sector`, `subsector`, `organization`, `offering`, `process`, `input`, or `output`.

## Output

The page reports productive rover-hours, elapsed hours including charging and downtime, operating-window fit, achievable area, intervention count, operator hours, manual cost, rover variable and all-in cost, savings, and the number of comparable jobs to recover hypothetical purchase cost. Choose **Download readiness brief** to save the assumptions, recalculated results, limitations, and vendor questions as JSON. **Import brief** validates and recalculates a downloaded file instead of trusting stored result values. **Print** opens a print-friendly summary.

### Example

```json
{
  "machineHours": 2,
  "elapsedHours": 1.875,
  "windowUtilizationPercent": 23.4375,
  "fitsOperatingWindow": true,
  "coveredAreaSquareMeters": 10000,
  "interventionCount": 1,
  "operatorHours": 0.75,
  "manualCostCents": 25000,
  "roverVariableCostCents": 4250,
  "roverAllInJobCostCents": 6250,
  "breakEvenJobs": 10
}
```

## Behavior

The estimate is deterministic and does not modify its input. Charging reduces available time according to the runtime/charge cycle; downtime reduces availability; total productive rover-hours determine operation and supervision costs. Intervention count rounds up. Purchase price is divided evenly across comparable jobs. Conservative, base, and optimistic results are sensitivity scenarios, not probabilities or confidence intervals. Break-even thresholds report the coverage speed or operating charge required for variable-cost parity; impossible thresholds return `null`. Invalid inputs produce an `invalid-input` result with human-readable issues.

## Limits and assumptions

Effective coverage is assumed to already reflect crop, soil, weather, terrain, and field layout. The model cannot establish whether a rover can weed safely or effectively. Capital cost uses a user-selected job count and excludes financing, resale, and maintenance unless included in the operating-cost assumption. The model is not procurement advice.
