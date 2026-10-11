# Outcome store parameter-bag arity cleanup

- Unexpected hurdle: the first global no-cache ESLint run returned status 1 because remaining findings are expected while the rollout is in progress; its JSON report still contained the complete inventory.
- Diagnosis: the target writer used one `context` argument for captured adapters and live path settings. Existing tests establish that adapters stay captured while `outcomeDir` and `pathModule` remain live, including a directory change during `mkdir`.
- Fix: prepared a writer that captures only the file adapters and receives the live options object per call. It keeps the AllowEffects token at the write boundary and resolves the path after directory creation.
- Next time: use the checked-in JSON report even when the targeted rule exits nonzero, and preserve live configuration timing. The next finding is `src/core/local/notion-codex/poll.js:536` (effective arity 5).
