# Chronoflow authored solution witness

- Unexpected hurdle: the Archive Entry solution existed only as an inline test replay, so the level had no durable executable witness.
- Diagnosis: replaying route=archive, edit cell 11, opening the sluice, and advancing in batches completed at tick 257 with target volume 0.12035; the decoy route remained at zero target volume after 1,800 steps.
- Fix: add a named command sequence and pure replay helper in `chronoflow/witness.js`; tests compare repeat replays and enforce target, edit-budget, and cell-volume bounds, plus the decoy negative control.
- Next-time guidance: when level geometry or solver rules change, replay this witness and update its expected observations only after checking the negative route again.
