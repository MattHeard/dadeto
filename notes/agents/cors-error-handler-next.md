The Express CORS error handler was blowing up in production because `next` was `undefined`. I expected Express to treat the returned function as error middleware, but the rest-parameter signature meant `corsErrorHandler.length === 0`, so Express invoked it like a normal middleware and only passed `(req, res, next)`—the missing `err` position meant the last arg was actually the `next` callback and my code handed `undefined` to the real `next`.

I confirmed the issue by reviewing the stack trace (TypeError coming from `next` inside `corsErrorHandler`) and the handler registration (`app.use(createCorsErrorHandler())`). The fix was to declare the handler with the four canonical parameters (`err, _req, res, next`) so Express recognizes it as an error handler and supplies the right arguments. With that change, a generic error can be forwarded instead of crashing the middleware, and CORS denials still return the structured 403 payload.

Lessons for future agents:

- Watch handler signatures closely when working with Express middleware—`function foo(...args)` looks flexible, but Express uses the `.length` property to decide whether a middleware handles errors. This is surprising once you expect rest parameters to behave like the four-arg signature.
- When debugging Cloud Function logs, correlate stack traces with the middleware order in source; the earliest frames often hint at registration order mismatches.
- Confirm fixes with the full `npm test` suite so the proven configuration still runs and coverage stays untouched.

Still open: double-check the next Cloud Function deployment to ensure the runtime error disappears for existing rollouts.
