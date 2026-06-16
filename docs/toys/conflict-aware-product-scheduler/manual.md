# CONF1 — Conflict-Aware Product Scheduler

## What this toy does

Conflict-Aware Product Scheduler ranks candidate product increments against active work. It helps choose a small slice that creates value while avoiding file overlap, shared-surface conflicts, test/refactor collisions, and deployment risk.

The toy is a deterministic JSON scoring helper. It does not inspect a repository or connect to a project-management tool.

## Input format

Paste a JSON object with:

- `candidates`: array of candidate product increments
- `activeWork`: array of current work items

```json
{
  "candidates": [
    {
      "id": "group-ride-minutes",
      "title": "Shared minutes on group rides",
      "productValue": 9,
      "learningValue": 7,
      "userFeedbackValue": 8,
      "expectedTouchSet": [
        "src/rides/groupRide.js",
        "src/billing/passMinutes.js",
        "src/receipts/groupRideReceipt.js"
      ],
      "sharedTouchRisk": 2,
      "expectedTestRefactorCollision": 3,
      "expectedDeploymentRisk": 2
    }
  ],
  "activeWork": [
    {
      "id": "billing-refactor",
      "touchSet": [
        "src/billing/passMinutes.js"
      ],
      "reservedSurfaces": [
        "src/payments",
        "src/billing/passMinutes.js"
      ]
    }
  ]
}
```

## Candidate fields

### `id`

A string identifier. If missing, the toy creates a fallback such as `candidate-1`.

### `title`

A readable title. If missing, the title falls back to the `id`.

### `productValue`

How much direct product value the candidate creates.

### `learningValue`

How much the candidate teaches you about the product, architecture, users, or delivery system.

### `userFeedbackValue`

How much useful feedback the candidate can produce once released.

### `expectedTouchSet`

A list of file paths or surfaces the candidate is expected to touch.

Only string entries are counted.

### `sharedTouchRisk`

A numeric penalty for touching shared infrastructure, shared UI patterns, common data models, or other high-coordination surfaces.

### `expectedTestRefactorCollision`

A numeric penalty for expected conflict with current test-writing, refactoring, or cleanup work.

### `expectedDeploymentRisk`

A numeric penalty for rollout, migration, release, operational, or monitoring risk.

## Active work fields

### `touchSet`

Files or surfaces already being changed by current work.

### `reservedSurfaces`

Files or surfaces that are currently sensitive or should be avoided.

The scheduler counts overlaps between a candidate’s `expectedTouchSet` and these active-work sets.

## Scoring model

The toy computes:

```text
value =
  productValue
+ learningValue
+ userFeedbackValue

coordinationCost =
  expectedFileOverlap
+ expectedSharedInfrastructureTouch
+ expectedTestRefactorCollision
+ expectedDeploymentRisk

score = value - coordinationCost
```

Where:

- `expectedFileOverlap` counts overlap between candidate `expectedTouchSet` and active-work `touchSet`.
- `expectedSharedInfrastructureTouch` equals `sharedTouchRisk` plus overlap between candidate `expectedTouchSet` and active-work `reservedSurfaces`.

## Output format

The toy returns JSON:

```json
{
  "ranked": [
    {
      "id": "group-ride-minutes",
      "title": "Shared minutes on group rides",
      "score": 17,
      "penalties": {
        "expectedFileOverlap": 1,
        "expectedSharedInfrastructureTouch": 3,
        "expectedTestRefactorCollision": 3,
        "expectedDeploymentRisk": 2
      },
      "reason": "score 17; 1 file overlap, 3 shared-surface touches, 3 test collisions, 2 deployment risks"
    }
  ],
  "summary": {
    "candidateCount": 1,
    "activeWorkCount": 1
  }
}
```

Candidates are sorted by highest score first. Ties are sorted by `id`, then `title`.

## How to use it

1. List a few candidate product increments.
2. Estimate the value fields.
3. Estimate the risk fields.
4. Add active work with `touchSet` and `reservedSurfaces`.
5. Submit the JSON.
6. Use the ranking as a starting point for discussion.

## Tips

- Use a consistent scoring scale, such as `0–10`.
- Keep candidate slices small enough that their expected touch set is plausible.
- Use `reservedSurfaces` for areas where parallel work would be especially expensive.
- Rerun the toy when active work changes.

## Limitations

- The toy does not know the real repository.
- It does not infer files from feature names.
- It does not estimate effort.
- It does not understand deadlines.
- It only scores the numbers and lists you provide.

## Troubleshooting

### My candidates all score zero

Check that the value fields use the exact names `productValue`, `learningValue`, and `userFeedbackValue`.

### Overlap is not counted

Check that the same exact string appears in the candidate `expectedTouchSet` and the active-work `touchSet` or `reservedSurfaces`.

### A field seems ignored

The toy only reads the exact field names documented above. For example, `feedbackValue` is ignored; use `userFeedbackValue`.
