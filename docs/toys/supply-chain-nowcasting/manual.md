# Supply-chain Nowcasting — Field Guide

## What this toy does

Open the standalone [Supply Signals planner](/supply-chain-nowcasting/). Choose the disrupted route, capacity reduction, duration, warning lead time, and ranking rule. Apply or reset the one-click disruption to compare current response with an earlier hypothetical warning. The page shows route costs, daily shortfall, capacity and one-time buffer options, feasibility, arrival day, and incremental cost. Paste a scenario JSON object or load a `.json` file to replace the sample; export downloads the full response record, which can be imported again. Every result is a planning scenario, not a real forecast or procurement instruction.

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
    "maxBufferUnits": 12,
    "unit": "units/day"
  },
  "routes": [
    { "id": "north-lane", "fromId": "north", "toId": "market", "capacityUnitsPerDay": 10, "maxCapacityUnitsPerDay": 20, "leadTimeDays": 0, "unitCostCents": 5 }
  ],
  "disruption": {
    "routeId": "north-lane",
    "startsDay": 2,
    "durationDays": 2,
    "reductionPercent": 100,
    "warningLeadDays": 2
  },
  "rankingCriterion": "shortfall-then-cost",
  "mitigations": [
    { "id": "fast-backup", "kind": "capacity", "routeId": "north-lane", "capacityUnitsPerDay": 10, "leadTimeDays": 2, "unitCostCents": 7 },
    { "id": "buffer", "kind": "buffer", "bufferUnits": 5, "leadTimeDays": 1, "unitCostCents": 3 }
  ]
}
```

### Schema

The initial planner supports direct supplier-to-destination routes. That shape makes cycles impossible except as an invalid route direction, which is reported explicitly. Multi-hop networks and time-varying demand are not modeled yet.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "required": ["horizonDays", "suppliers", "destination", "routes", "disruption", "rankingCriterion", "mitigations"],
  "properties": {
    "horizonDays": { "type": "integer", "minimum": 1 },
    "suppliers": { "type": "array", "items": { "type": "object", "required": ["id", "capacityUnitsPerDay", "unit"] } },
    "destination": { "type": "object", "required": ["id", "dailyDemandUnits", "startingInventoryUnits", "maxBufferUnits", "unit"] },
    "routes": { "type": "array", "items": { "type": "object", "required": ["id", "fromId", "toId", "capacityUnitsPerDay", "maxCapacityUnitsPerDay", "leadTimeDays", "unitCostCents"] } },
    "disruption": { "type": "object", "required": ["routeId", "startsDay", "durationDays", "reductionPercent", "warningLeadDays"] },
    "rankingCriterion": { "enum": ["shortfall-then-cost", "cost-then-shortfall"] },
    "mitigations": { "type": "array", "items": { "type": "object", "required": ["id", "kind", "leadTimeDays", "unitCostCents"] } }
  },
  "additionalProperties": false
}
```

## Output

The planner returns baseline and candidate costs, daily inventory and unmet demand, a clearly hypothetical warning, and candidates sorted by feasibility followed by the selected ranking criterion. Impossible candidates remain visible with a reason. Disruptions recover after their configured duration. Capacity options add a daily amount to a route; buffer options add a one-time quantity, bounded by the destination's maximum buffer capacity.

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
  "rankingCriterion": "shortfall-then-cost",
  "rankedMitigations": [
    { "id": "fast-backup", "feasible": true, "arrivalDay": 2, "shortfallAvoidedUnits": 30 }
  ]
}
```

## Behavior

Run `node scripts/run-jest.js --runInBand --runTestsByPath test/core/browser/game/supplyChainNowcasting.test.js test/core/browser/game/supply-chain-nowcasting-page.test.js`. The pure planner performs no network calls and never executes mitigations. Invalid IDs, units, route directions, capacity, and lead times return explicit issues. Invalid JSON or invalid scenarios leave the current plan unchanged. The export includes the original scenario, baseline, hypothetical signal, every ranked option, ranking rule, constraints, provenance, and uncertainty notes. The standalone browser presenter contains no network calls or browser storage. CSV input and optional future-industry identifiers remain planned follow-up work.
