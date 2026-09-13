# Static JSONL table content type

- Unexpected hurdle: the aggregate gate hit sandbox `spawnSync ... node EPERM`, then exhausted `/tmp` while running coverage shards.
- Diagnosis: focused generator tests passed; elevated execution isolated the remaining failures to cache capacity, the existing `npm audit` js-yaml advisory, and initially missing type/global-boundary coverage.
- Fix: kept JSONL parsing build-only, removed the browser module's direct document default, used a workspace-local Jest cache with bounded shards, and added validation/render regression coverage.
- Next time: run large Dadeto coverage gates with `JEST_CACHE_DIRECTORY` in the workspace and `DADETO_COVERAGE_SHARD_SIZE=40` from the outset.
