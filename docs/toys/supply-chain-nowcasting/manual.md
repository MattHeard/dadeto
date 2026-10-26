# Supply-chain Nowcasting — Field Guide

## What this toy does

Open the standalone [Supply Signals planner](/supply-chain-nowcasting/). Choose the disrupted route, capacity reduction, duration, warning lead time, and ranking rule. Apply or reset the one-click disruption to compare current response with an earlier hypothetical warning. The page shows route costs, daily shortfall, capacity and one-time buffer options, feasibility, arrival day, minimum warning for arrival within the horizon, remaining shortfall, and incremental cost. Paste a scenario JSON object or the record-oriented CSV below, or load a `.json` or `.csv` file to replace the sample after validation. Export downloads the full JSON response record, which can be imported again. Every result is a planning scenario, not a real forecast or procurement instruction.

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

The initial planner supports direct supplier-to-destination routes. That shape makes cycles impossible except as an invalid route direction, which is reported explicitly. Multi-hop networks and time-varying demand are not modeled yet. A supplier reserves capacity across all of its outgoing routes: their combined baseline allocation cannot exceed its capacity. A capacity mitigation can use only the supplier capacity still unallocated across those routes, as well as the selected route’s remaining capacity. Disruption does not automatically release a route’s reserved allocation.

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
    "mitigations": { "type": "array", "items": { "type": "object", "required": ["id", "kind", "leadTimeDays", "unitCostCents"] } },
    "industryGraphReferences": {
      "type": "object",
      "properties": {
        "organizations": { "type": "array", "items": { "type": "string", "minLength": 1 } },
        "offerings": { "type": "array", "items": { "type": "string", "minLength": 1 } },
        "processes": { "type": "array", "items": { "type": "string", "minLength": 1 } },
        "inputs": { "type": "array", "items": { "type": "string", "minLength": 1 } },
        "outputs": { "type": "array", "items": { "type": "string", "minLength": 1 } },
        "relationships": { "type": "array", "items": { "type": "string", "minLength": 1 } }
      },
      "additionalProperties": false
    }
  },
  "additionalProperties": false
}
```

## Output

The planner returns baseline and candidate costs, daily inventory and unmet demand, a clearly hypothetical warning, and candidates sorted by feasibility followed by the selected ranking criterion. Impossible candidates remain visible with a reason. Each option also includes `minimumWarningLeadDays`: zero when a current response arrives within the horizon, a positive number for the minimum advance warning, or null when its lead time cannot fit even with a day-zero decision. This timing threshold does not override capacity constraints or guarantee avoided shortfall. It is preserved in the exported plan. Disruptions recover after their configured duration. Capacity options use the longer of their own lead time and the selected route’s fulfillment lead time, so they cannot arrive sooner than the route permits. Capacity options add a daily amount to a route; buffer options add a one-time quantity using their own lead time, bounded by the destination's maximum buffer capacity. Each ranked result includes `remainingShortfallUnits`, and the page explicitly warns when no feasible option covers the entire shortage.

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

### CSV format

CSV uses one record per row and the exact column names below. Leave fields that do not apply empty. Required records are one `meta`, one `destination`, one `disruption`, at least one `supplier`, at least one `route`, and one or more `mitigation` rows. Text fields support commas when quoted and escaped quotes (`""`); quoted fields cannot contain line breaks. The planner validates references, units, ranges and feasibility before the active scenario changes.

```csv
record,id,horizonDays,rankingCriterion,capacityUnitsPerDay,unit,dailyDemandUnits,startingInventoryUnits,maxBufferUnits,fromId,toId,maxCapacityUnitsPerDay,leadTimeDays,unitCostCents,routeId,startsDay,durationDays,reductionPercent,warningLeadDays,kind,bufferUnits
meta,,5,shortfall-then-cost
supplier,north,,,10,units/day
supplier,south,,,10,units/day
destination,market,,,,units/day,10,10,10
route,north-lane,,,10,,,,,north,market,10,0,5
route,south-lane,,,0,,,,,south,market,10,0,9
disruption,,,,,,,,,,,,,,north-lane,2,3,100,2
mitigation,alternate-supplier,,,10,,,,,,,,2,10,south-lane,,,,,capacity
mitigation,emergency-buffer,,,,,,,,,,,1,3,,,,,,buffer,10
```

CSV numeric fields are plain numbers in the documented units. Rows may be reordered after the header. Duplicate or missing required singleton records, malformed quoting, missing values and planner validation errors are shown inline; an invalid import leaves the current plan active.

## Optional industry graph IDs

JSON may include an optional `industryGraphReferences` object with arrays named `organizations`, `offerings`, `processes`, `inputs`, `outputs`, and `relationships`. Each value is an opaque, non-empty string ID. These IDs are metadata only: the planner does not look them up, infer missing links, or change its results. Omit unknown entities; the synthetic sample deliberately invents no catalog identifiers. CSV can carry the same references as optional `industry-reference` rows. Set `record` to `industry-reference`, place the opaque ID in `id`, and set `kind` to `organization`, `offering`, `process`, `input`, `output`, or `relationship`; leave unrelated columns empty.

```json
{
  "industryGraphReferences": {
    "organizations": ["org:provided-by-your-catalog"],
    "offerings": ["offering:provided-by-your-catalog"],
    "processes": ["process:provided-by-your-catalog"],
    "inputs": ["input:provided-by-your-catalog"],
    "outputs": ["output:provided-by-your-catalog"],
    "relationships": ["relationship:provided-by-your-catalog"]
  }
}
```

## Behavior

Run `node scripts/run-jest.js --runInBand --runTestsByPath test/core/browser/game/supplyChainNowcasting.test.js test/core/browser/game/supply-chain-nowcasting-page.test.js`. The pure planner performs no network calls and never executes mitigations. Invalid IDs, units, route directions, capacity, and lead times return explicit issues. Invalid JSON, CSV, or planner scenarios leave the current plan unchanged. The export includes the original scenario, baseline, hypothetical signal, every ranked option, ranking rule, constraints, provenance, and uncertainty notes. The standalone browser presenter contains no network calls or browser storage. Optional future-industry identifiers are carried as opaque metadata only; they do not trigger graph lookups or affect calculations.
