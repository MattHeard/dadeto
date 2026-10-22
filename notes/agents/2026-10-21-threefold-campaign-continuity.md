# THREEFOLD campaign continuity

Owning Bead: dadeto-dsrw. Rank 1 remains Partial / Active.

The previous regional export omitted shared clock, fate and water; resumed pages also kept stale copies. The fix composes the existing region/domain codecs behind one injected revisioned storage document, stages each world action, and validates complete portable backups before any mutation. Permanent damage/actor projection lives in campaign-projection.js. The shared handheld presenter uses format descriptors for campaign file IO and announces save/restore failures.

A useful regression distinction: independent regional envelopes remain isolated **inside** the document. Tests inspecting raw key counts or deleting old physical keys must use the campaign record facade after migration. Preserve their domain/fate/water assertions. Corrupt canonical documents never fall back silently to stale legacy keys.

Revision checks protect alternating/resumed pages and prevent unsaved branches from overwriting newer persisted progress. They are not an atomic compare-and-swap across simultaneous processes. Failed writes retain local play and export; strict restore failure leaves old storage and live state intact. Restore is an explicit whole-campaign replacement, not a merge. No browser clock advances game time.

Acceptance evidence is recorded on the Bead: related Jest with changed-core coverage, fast npm run check, generated build/manual checks, and the asynchronous Full Check separately. Continue with arrival-fate milestones in dadeto-bgpg after this loop; do not mark the overall game complete.

## Browser storage denial review

A throwing `window.localStorage` getter reaches the runtime as an explicitly present `storage: undefined`. Do not turn that into a durable-looking environment Map. Only a headless caller that omits the storage option uses the environment adapter; an explicitly unavailable browser storage boundary retains local play and backup but marks progress dirty and rejects strict restore persistence. The page-boundary regression reproduces the false-success bug before the fix and checks state preservation afterward.

The first isolated review checkout failed because `/tmp` is a nearly full 2 GiB tmpfs. Keep review worktrees and temporary evaluator files on the main filesystem; do not delete unrelated temporary content or rebuild Beads to work around the passive-export prefix warning. The canonical Beads DB remained accessible.
