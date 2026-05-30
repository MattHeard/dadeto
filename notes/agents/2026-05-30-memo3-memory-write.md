# MEMO3 Memory Scalar/Vector Write

- Unexpected hurdle: `bd` is required by repo workflow, but the command is not installed in this container (`/bin/bash: bd: command not found`), so loop evidence had to be retained in docs/tests/PR notes instead of bead comments.
- Diagnosis path: started from existing `MEMO1`/`MEMO2` implementations and used `MEMO2` read-back tests to keep the new writer compatible with existing memory inspection behavior.
- Chosen fix: added `memoryScalarVectorWrite` (`MEMO3`) as a JSON write toy for temporary, permanent, and envelope locations, with scalar/vector leaf validation and automatic object/array container construction.
- Next-time guidance: when adding write-side memory behavior, include read-back assertions through the read-side toy in the same env fixture so persistence-helper mistakes show up as user-visible failures.
