Simplified `resolveRenderPlan` so it now trusts the variant and page snapshots to already contain data: the helper reads `snap.data()` and `pageSnap.data()` directly instead of falling back to empty objects, letting any contract violations fail fast.

Unexpected hurdle: none—the precondition already held wherever `resolveRenderPlan` is called.

Lesson: when helpers depend on upstream invariants, drop redundant defaults to keep logic straightforward and errors loud.

Open questions: none.
