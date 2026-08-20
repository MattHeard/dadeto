# Toy Spec: Asset Custodian Segment Assignment Predicate

`ASSE5` returns a JSON boolean for a proposed `{assetId, segmentId, custodianPersonId}`. It resolves segment intervals from `points` and `segments`, then rejects positive-duration overlap with an existing assignment for either the asset or custodian person. Touching intervals are allowed.
