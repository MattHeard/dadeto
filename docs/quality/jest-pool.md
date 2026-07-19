# Shared Jest pool

Normal Jest workloads acquire the machine-wide slot in `/tmp/dadeto-jest-pool` before starting. The default pool size is one, so Jest processes from parallel Codex worktrees queue instead of consuming memory concurrently. Coverage shards remain serial and continue to use Jest's `--maxWorkers=1`.

Override the location or diagnostics when needed:

```bash
DADETO_JEST_POOL_DIR=/some/local/path
DADETO_JEST_POOL_POLL_MS=250
DADETO_JEST_POOL_TIMEOUT_MS=600000
```

The active owner is recorded in `active/owner.json`. A lock whose recorded PID is no longer alive is reclaimed automatically.
