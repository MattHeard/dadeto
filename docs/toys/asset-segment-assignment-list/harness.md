# Harness

Use the public toy at `https://mattheard.net/#ASSE2`.

Example input:

```json
{"memoryLocation":"temporary","path":"assetSegmentAssignments","assignment":{"assetId":"A1","segmentId":"S1"}}
```

The response reports `appended: true`, the resulting list length, and the appended `{assetId, segmentId}` object.
