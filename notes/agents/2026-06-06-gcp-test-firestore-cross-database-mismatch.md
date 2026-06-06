# GCP Firestore cross-database mismatch

## Unexpected hurdle
The Playwright failure was not a browser regression. The rendered `new-story` flow was failing because the Cloud Function tried to read/write Firestore data across database boundaries.

## Diagnosis path
The Cloud Run logs showed `INVALID_ARGUMENT: The request was for database '(default)' but was attempting to access database 't-ef4619ec'`. That pointed to a Firestore client/reference mismatch rather than a missing test or a broken HTML page. Tracing the wiring showed that the shared Firebase app context was resolving Firestore without explicitly threading the runtime environment through.

## Chosen fix
Make the shared Firebase app context resolve Firestore with the current environment variables explicitly, so tenant deployments bind to the tenant database instead of drifting to the default client.

## Next-time guidance
When a Cloud Function throws a database mismatch, inspect both sides of the wiring: the runtime environment passed into Firestore resolution and the provenance of any document references being read back from snapshots.
