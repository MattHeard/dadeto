## Process-new-page coverage push (2025-11-06)

- **Unexpected hurdle:** Jest only surfaced per-file gaps via the full suite report, so targeting missing branches meant inferring the untested edges from the Firestore mocks. I double-checked structure by tracing how `resolveIncomingOptionContext` dereferences parent pointers before writing any assertions.
- **Diagnosis & options:** Option submissions that lost their target page forced me to rebuild the mock hierarchy (option → variant → page → story). I considered stubbing internals directly but kept the test at the handler level so future refactors still exercise the same branches.
- **What I’d tweak next time:** Start by sketching the Firestore doc tree on paper before writing mocks—it clarified which parents needed `parent.parent` chains and saved a second edit pass.
- **Actionable takeaway:** When branching on Firestore references, reuse helper factories (like `createStoryHierarchy`) and extend them rather than rebuilding mocks per test. It keeps the structure consistent and prevents missing `collection` or `parent` links that the core code expects.
- **Open question:** Could we expose lighter-weight builders for option/page snapshots in the shared test utilities? That might cut down on bespoke mocking the next time we chase coverage in this area.
