# Local Server Failure Mode Seeds

## Symptom
- `npm run start:writer:playwright` boots but endpoints fail, hang, or return inconsistent data.

## Likely cause
- Filesystem permission/path mismatch, malformed workflow payloads, or stale local data fixtures.

## Detection signal
- Server console errors, 5xx responses from `/api/writer/*`, and failing related Jest tests.

## Prevention harness
- Add endpoint-level tests around payload validation and storage adapter boundaries.
- Validate expected local data directory existence and access at startup.

## Fix path
1. Capture failing request/response and server log excerpt.
2. Reproduce with minimal payload against local server.
3. Patch adapter or validation layer and add regression test.
4. Verify with targeted tests and writer smoke run.
