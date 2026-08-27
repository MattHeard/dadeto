# Resumable per-file mutation sweep

Run the complete `src/core` sweep with:

```bash
npm run mutant:iterate
```

The command scans JavaScript files in stable order, runs the isolated
worktree mutation check for each file, and writes checkpoints under
`reports/mutation/`:

- `core-file-scan.jsonl` records each file's terminal result.
- `core-file-scan-summary.json` records totals, failures, timeouts, and files
  with surviving mutants.
- `core-files-with-surviving-mutants.json` lists files needing follow-up.

Restarting the command resumes from the checkpoint and skips files already
recorded as successful. Set `CORE_MUTANT_TIMEOUT_MS` to change the per-file
wall-clock limit, or `DADETO_MUTANT_ROOT` to scan a repository root other than
the current directory.

After a survivor is fixed, rerun the command; the file's checkpoint is
replaced by its latest result. A sweep is complete only when the summary has
zero pending, failed, timed-out, and survivor files.
