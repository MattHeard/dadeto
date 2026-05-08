# 2026-05-07 cloud complexity lint loop

- Unexpected hurdle: the installed `bd` CLI (v1.0.3) did not read the repository's existing JSONL issue store and attempted to migrate it into an embedded Dolt workspace, temporarily deleting `.beads/issues.jsonl`.
- Diagnosis path: restored the tracked JSONL issue file, inspected open beads directly with a Python JSONL reader, and verified the stale tic-tac-toe JSDoc bead with targeted ESLint before touching cloud files.
- Chosen fix: removed the cloud complexity warnings by extracting fallback/default normalization helpers in `src/core/cloud/cloud-core.js` and `src/core/cloud/hide-variant-html/hide-variant-html-core.js`, then recorded the bead evidence directly in `.beads/issues.jsonl` because the CLI backend was unsafe for this checkout.
- Next-time guidance: before running write-capable `bd` commands in this repo, verify whether the local CLI can list the existing JSONL beads without creating `.beads/embeddeddolt/`; if it cannot, avoid migration side effects and use a compatible CLI or document JSONL-only updates explicitly.
