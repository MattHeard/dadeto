# Supply-chain Nowcasting — Field Guide

## What this toy does

Open the standalone [Supply Signals planner](/supply-chain-nowcasting/). Apply the one-click route disruption and compare a current response with an earlier hypothetical warning. The page calculates daily deliveries and unmet demand, shows when each option could arrive, and ranks candidate capacity changes by units of shortfall avoided. Every result is a planning scenario, not a real forecast or procurement instruction.

## Input

The pure model accepts suppliers, direct supplier-to-destination routes, a destination's demand and starting inventory, a disruption, and candidate mitigations. Capacities and demand use `units/day`; route and mitigation lead times use whole days. The following small network has one route under disruption and two possible supply alternatives:

### Example

```json
{
  "horizonDays": 5,
  "suppliers": [
    { "id": "north", "capacityUnitsPerDay": 20, "unit": "units/day" },
    { "id": "south", "capacityUnitsPerDay": 10, "unit": "units/day" }
  ],
  "destination": {
    "id": "market",
    "dailyDemandUnits": 10,
    "startingInventoryUnits": 10,
    "unit": "units/day"
  },
  "routes": [
    { "id": "north-lane", "fromId": "north", "toId": "market", "capacityUnitsPerDay": 10, "maxCapacityUnitsPerDay": 20, "leadTimeDays": 0 }
  ],
  "disruption": {
    "routeId": "north-lane",
    "startsDay": 2,
    "reductionPercent": 100,
    "warningLeadDays": 2
  },
  "mitigations": [
    { "id": "fast-backup", "routeId": "north-lane", "capacityUnitsPerDay": 10, "leadTimeDays": 2 }
  ]
}
```

### Schema

The initial planner supports direct supplier-to-destination routes. That shape makes cycles impossible except as an invalid route direction, which is reported explicitly. Multi-hop networks and time-varying demand are not modeled yet.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "required": ["horizonDays", "suppliers", "destination", "routes", "disruption", "mitigations"],
  "properties": {
    "horizonDays": { "type": "integer", "minimum": 1 },
    "suppliers": { "type": "array", "items": { "type": "object", "required": ["id", "capacityUnitsPerDay", "unit"] } },
    "destination": { "type": "object", "required": ["id", "dailyDemandUnits", "startingInventoryUnits", "unit"] },
    "routes": { "type": "array", "items": { "type": "object", "required": ["id", "fromId", "toId", "capacityUnitsPerDay", "maxCapacityUnitsPerDay", "leadTimeDays"] } },
    "disruption": { "type": "object", "required": ["routeId", "startsDay", "reductionPercent", "warningLeadDays"] },
    "mitigations": { "type": "array", "items": { "type": "object", "required": ["id", "routeId", "capacityUnitsPerDay", "leadTimeDays"] } }
  },
  "additionalProperties": false
}
```

## Output

The planner returns the baseline daily inventory and unmet demand, a clearly hypothetical warning, and candidates sorted by feasibility, shortfall avoided, then ID. Impossible candidates remain visible with a reason.

### Example

```json
{
  "baseline": {
    "totalShortfallUnits": 30,
    "firstShortfallDay": 3
  },
  "signal": {
    "status": "early-warning",
    "decisionDay": 0,
    "disruptionDay": 2,
    "leadTimeDays": 2,
    "hypothetical": true
  },
  "rankingCriterion": "shortfall-avoided-units",
  "rankedMitigations": [
    { "id": "fast-backup", "feasible": true, "arrivalDay": 2, "shortfallAvoidedUnits": 30 }
  ]
}
```

## Behavior

Run `npx jest --runInBand --runTestsByPath test/core/browser/game/supplyChainNowcasting.test.js test/core/browser/game/supply-chain-nowcasting-page.test.js`. The pure planner performs no network calls and never executes mitigations. Invalid IDs, units, route directions, capacity, and lead times return explicit issues. The standalone browser presenter contains no network calls or browser storage. Export/import and expanded cost, duration, and identifier inputs remain planned follow-up work.
