# Payment webhook e2e simulator fix

- Hurdle: the local Playwright webhook path returned 404/400 even though the core handler itself was correct.
- Diagnosis: the webhook was exposed on a separate path, and the simulator server was not forwarding `req.path`, so UUID extraction on the credit API failed with `Missing UUID`.
- Fix: route the webhook through the simulator, forward `path` into the handler request, seed the customer mapping in the simulator fixture, and use UUID-shaped api-key ids in the e2e test.
- Next time: when a handler depends on request-path parsing, verify the server adapter passes the full request shape before changing the core logic.
