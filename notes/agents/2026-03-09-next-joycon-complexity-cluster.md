## Context

`dadeto-w7fi` re-read the current `joyConMapper.js` lint surface after the earlier axis-helper cleanup.

## Selection

The next bounded complexity cluster is the local payload/row-state helper slice in [joyConMapper.js](/home/matt/dadeto/src/core/browser/inputHandlers/joyConMapper.js):

- `buildPayload` at line `724`
- `getCurrentControlKey` at line `740`
- `getPendingRowState` at line `775`

## Why this target

- The three warnings are adjacent and conceptually related.
- They are smaller and more local than the later `refreshStoredState`, handler-arrow, and top-level handler warnings.
- This keeps the next lint bead in the “helper cluster” category instead of jumping early to broader handler-level cleanup.

## Next-time guidance

Shape the next implementation bead around the payload/row-state helpers as one bounded slice. After that lands, re-read the lint surface before choosing between `refreshStoredState` and the remaining handler-level warnings.
