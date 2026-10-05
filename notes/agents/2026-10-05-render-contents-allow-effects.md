# Render-contents CDN invalidation AllowEffects

- Unexpected hurdle: Beads commands remain blocked by a Dolt access lock after workspace restart; `bd status` times out while no lock holder appears in the workspace process list.
- Diagnosis path: checked daemon status through `bd prime`, tried no-daemon reads and forced doctor recovery from both DB and JSONL. JSONL is older than the local database, so did not replace the database.
- Chosen fix: continue the authorized narrow code change using the existing capability boundary pattern; keep metadata token GET on ordinary fetch and require one fresh permission per invalidation POST.
- Next-time guidance: resolve the shared Dolt lock and record the missing Beads loop contract/evidence before closing this work.
