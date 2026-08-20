# Harness

Use the public toy at `https://mattheard.net/#ASSE3`.

Example input:

```json
{"points":[{"pointId":"P1","timestamp":"2026-01-01T00:00:00Z"},{"pointId":"P2","timestamp":"2026-01-01T01:00:00Z"}],"segments":[{"segmentId":"S1","startPointId":"P1","endPointId":"P2"}],"assignments":[],"proposedAssignment":{"assetId":"A1","segmentId":"S1"}}
```

The result is the boolean string `true`.
