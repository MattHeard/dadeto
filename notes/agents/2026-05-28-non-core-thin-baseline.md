# Non-core-thin Baseline Reset

The first pass after removing the exemption baseline surfaced two kinds of follow-up work: simple line-count wrappers and deeper type-heavy files.

What tripped us up:
- `variantRedirect.js` was just over the 50-line limit even after a first compaction pass.
- The memory-vector toys had stale `Map<string, Function>` annotations that kept `tsdoc:check` pointing at the new helper path.
- Once those were fixed, lint started complaining about complexity in the memory-vector response helpers.

What worked:
- Emptying `non-core-thin-exemptions.json` made the real overage list visible immediately.
- Turning `src/build/textUtils.js` into a compatibility re-export removed one backlog item quickly.
- Compacting `src/browser/variantRedirect.js` below the threshold was a safe low-risk win.

Next time:
- Keep the size-gate wins focused on wrapper files first.
- When a helper starts tripping complexity warnings, split the branchy logic into smaller pure helpers before trying to satisfy lint with a single function.
