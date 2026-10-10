# Render contents preflight handler

- Unexpected hurdle: `handlePreflight` combined permission, request, response, preflight result, and the stable response writer in one effective five-argument call.
- Diagnosis: the response writer is fixed when the validator is constructed; the other four values are request-specific and can remain direct parameters.
- Fix: introduced `createPreflightHandler` to capture the response writer, preserving OPTIONS detection and allowed/denied status behavior.
- Evidence: focused render-contents Jest passed (4 suites, 74 tests); fresh no-cache scan dropped from 4 to 3 findings; `npm run check` passed all 10 gates; `npm run build:cloud` passed. Logs and scan report are in `.tmp/`.
- Next-time guidance: continue with `ensureOriginAndMethodAllowed`, preserving the 403 CORS response and POST method enforcement.
