# THREEFOLD Unloaded Chunk Persistence

- Unexpected hurdle: the existing spatial test was named for reloaded chunks, but it projected the same combined geometry list after serialization, so it never exercised independently loading chunk data.
- Diagnosis: `destroyedGeometryIds` is already part of the serialized scale state, and `projectGeometryForScale` filters any loaded geometry by those stable IDs. The missing evidence was the load boundary, not a new world-streaming mechanism.
- Fix: split geometry into separate chunks, grow through one structure, serialize and restore the state, then project the other chunk and reload the first at the growth and finer scales. The regression checks deterministic output order and input/state immutability.
- Next time: use distinct geometry payloads for each chunk-load assertion; do not introduce a chunk-storage abstraction unless runtime needs one.
