# Tree visibility option arity cleanup

- Unexpected hurdle: this was the final parameter-bag lint finding in the cloud-only inventory, so the existing broader cleanup needed an exact rescan to confirm completion.
- Diagnosis: `propagateTreeVisibilityDelta` destructured five named fields from its options argument, which matched the parameter-bag lint pattern.
- Fix: changed the function to accept `options` and read the same five named fields explicitly. This preserves call shape and runtime behavior.
- Evidence: focused tree-visibility Jest tests passed (5 suites, 15 tests); `npm run tsdoc:check` and the targeted lint rule passed; the no-cache cloud scan covered 95 files and reported zero parameter-bag findings; `TMPDIR=/home/matt/dadeto/.tmp npm run check` passed all 10 gates.
- Next-time guidance: continue with the next bounded Notion specification loop. The cloud-only parameter-bag inventory is clear, but the broader Dadeto specifications goal remains open.
