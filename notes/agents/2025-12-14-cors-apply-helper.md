# Moderation CORS apply helper

## Context
- Needed to extract the CORS application logic so tests and future middleware wiring can reuse the same pattern without duplicating `app.use(cors(opts))`.

## Decisions
- Added `applyCorsMiddleware(app, cors, options)` to encapsulate the `cors` factory invocation before registering the middleware on the Express app.
- Kept existing origin predicate abstractions untouched to limit the change surface.

## Follow-ups
- Consider unit coverage around the helper if we begin sharing it between multiple HTTP functions.
