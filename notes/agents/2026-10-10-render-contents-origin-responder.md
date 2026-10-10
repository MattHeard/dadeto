# Render contents origin responder

- Unexpected hurdle: origin policy execution accepted a request's permission, response, and origin alongside a packed allowlist/header-writer config.
- Diagnosis: allowlist and header writer remain stable for the lifetime of the CORS handler, while permission, response, and origin vary by request.
- Fix: added a responder factory that closes over the stable policy dependencies. Preserved wildcard behavior for missing/invalid origins and explicit allow/deny headers for valid origins.
- Evidence: focused render-contents Jest passed (4 suites, 74 tests); fresh no-cache scan dropped from 6 to 5 findings; `npm run check` passed all 10 gates; `npm run build:cloud` passed. Logs and scan report are in `.tmp/`.
- Next-time guidance: continue with `handleKnownOrigin`, keeping allowed origin headers and denied `null` headers plus `Vary: Origin` exact.
