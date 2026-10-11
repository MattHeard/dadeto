# Blog copy arity cleanup

- Unexpected hurdle: the whole-core parameter-bag scan took about 80 seconds, much longer than the target-file scan.
- Diagnosis: `createCopyCore` unpacked six dependencies at entry, and `copyDirectoryTreeIfExists` unpacked seven fields across its plan and context records.
- Fix: retain the constructor options record and read dependencies at use sites; read the copy plan and adapter context fields directly while preserving copy order and log behavior.
- Evidence: focused suites (`blog.test.js`, `copy.test.js`, `runCore.test.js`) passed 40 tests; `npm run tsdoc:check` passed; `npm run check` passed all ten checks; fresh no-cache core scan reports 48 findings across 45 files, down from 50 across 46. Artifact: `.tmp/parameter-bag-global-after-blog-copy.json`.
- Next time: batch the two remaining findings in `src/core/local/symphony/tuiRenderer.js` as the next bounded loop, then refresh the inventory.
