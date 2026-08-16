# Object-minute asset registry toy

- Unexpected hurdle: the default repository check uses many coverage shards and is slow; sandboxed runs also reject child-process spawning.
- Diagnosis path: focused Jest passed, the beta build copied `ASSET1`, and the escalated check was rerun with `DADETO_COVERAGE_SHARD_SIZE=1000`.
- Chosen fix: keep the first slice pure JSON-in/JSON-out with explicit defaults and deterministic asset-ID ordering.
- Next-time guidance: build feasibility on top of this normalized asset shape; do not add persistence or reservations to the registry toy.
