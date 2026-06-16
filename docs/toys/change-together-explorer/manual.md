# CHAN1 — Change Together Explorer

## What this toy does

Change Together Explorer analyzes a static list of change sets and ranks:

- file pairs that often change together
- individual files that appear often and connect to many partner files

Use it when you want a quick, local co-change report before doing heavier repository mining. The toy does not read live Git history. It only analyzes the JSON you paste into it.

## Input format

Paste a JSON object with a `changeSets` array.

Each change set can contain:

- `id`: optional string identifier
- `files`: array of file path strings

Only string file paths are counted. Duplicate file paths inside one change set are removed. File paths are sorted internally, so pair ordering is deterministic.

If a change set has no string `id`, the toy creates a fallback ID such as `change-set-1`.

```json
{
  "changeSets": [
    {
      "id": "commit-a",
      "files": [
        "src/app.js",
        "src/router.js",
        "test/app.test.js"
      ]
    },
    {
      "id": "commit-b",
      "files": [
        "src/app.js",
        "src/router.js"
      ]
    },
    {
      "id": "commit-c",
      "files": [
        "src/billing.js",
        "test/billing.test.js"
      ]
    }
  ]
}
```

## How to use it

1. Gather a list of changes from commits, pull requests, task branches, or release notes.
2. Convert each unit of change into one object in the `changeSets` array.
3. Paste the JSON into the toy.
4. Click **Submit**.
5. Read the JSON report.

## Output format

The toy returns JSON with three top-level fields:

```json
{
  "rankedPairs": [],
  "rankedFiles": [],
  "summary": {}
}
```

### `rankedPairs`

Each entry contains:

- `files`: the two files in the pair
- `coChangeCount`: how many change sets contained both files
- `supportingChangeSetIds`: the change-set IDs that support the count
- `reason`: short text explanation

Pairs are sorted by highest `coChangeCount` first. Ties are sorted by file name.

### `rankedFiles`

Each entry contains:

- `file`: file path
- `touchCount`: how many change sets included the file
- `partnerCount`: how many distinct other files it appeared with
- `partnerFiles`: list of partner file paths
- `reason`: short text explanation

Files are sorted by highest `touchCount`, then highest `partnerCount`, then file name.

### `summary`

The summary contains:

- `changeSetCount`
- `fileCount`
- `pairCount`

## How to interpret the report

A high-ranking pair may indicate that the two files are coupled. This can be useful when deciding where to add tests, where to refactor, or where to inspect architecture boundaries.

A high-ranking file may be a coordination hotspot. It may be a central module, a broad integration point, or a file that is simply edited frequently.

The toy does not decide whether coupling is good or bad. It gives you evidence for further inspection.

## Practical examples

### Find risky files before refactoring

Run the toy on recent change sets. Look for files with high `touchCount` and high `partnerCount`. These files may deserve extra regression tests before refactoring.

### Spot hidden feature coupling

If `src/pricing.js` and `src/checkout.js` repeatedly appear together, users may experience them as one feature even if the codebase treats them separately.

### Check whether a split was successful

Run the toy before and after a refactor. If two files changed together frequently before the refactor but no longer do, the split may have reduced coupling.

## Troubleshooting

### The report is empty

The input may be invalid JSON, or `changeSets` may be missing or not an array. Invalid JSON produces an empty report rather than a crash.

### Files are missing from the report

Only string values inside `files` are counted. Numbers, objects, `null`, and other values are ignored.

### Pair counts look too low

Pairs are counted once per change set. Repeating the same file path inside a single change set does not increase the count.

## Limitations

- No live Git access.
- No network access.
- No database access.
- No awareness of commit dates or authors.
- No semantic understanding of the files.
- No distinction between production code, tests, docs, or configuration unless you encode that in file paths.
