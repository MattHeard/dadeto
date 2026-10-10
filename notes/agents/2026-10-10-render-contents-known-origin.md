# Render contents known-origin responses

- Unexpected hurdle: `handleKnownOrigin` accepted permission, response, origin, and a two-field allowlist/header-writer object.
- Diagnosis: the allowlist and header writer are fixed by the CORS handler; only permission, response, and origin change for each request.
- Fix: created a known-origin responder closure bound to the stable policy dependencies. Kept allowed and denied header values, `Vary: Origin`, and boolean results unchanged.
- Evidence: focused render-contents Jest passed (4 suites, 74 tests); fresh no-cache scan dropped from 5 to 4 findings; `npm run check` passed all 10 gates; `npm run build:cloud` passed. Logs and scan report are in `.tmp/`.
- Next-time guidance: handle the next reported `handlePreflight` finding by preserving allowed/denied response codes and empty bodies for OPTIONS requests.
