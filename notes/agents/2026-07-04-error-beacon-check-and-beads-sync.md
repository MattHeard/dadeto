Unexpected hurdle: `bd sync --from-main` failed during JSONL import with `bufio.Scanner: token too long`.
Diagnosis path: confirmed `npm run check` passed first, then attempted the required beads sync before commit and captured the import failure.
Chosen fix: continue with code landing without depending on that sync step, and keep the failure noted for follow-up.
Next-time guidance: if beads sync fails on import size, inspect the JSONL source or sync limits before retrying.
