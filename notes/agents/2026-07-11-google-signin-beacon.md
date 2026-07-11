# Google sign-in beacon routing

- Unexpected hurdle: the failure was caught before the global error handlers, so the existing console and unhandled-rejection coverage did not observe it.
- Diagnosis: `initializeGoogleSignIn` logged the rejected credential flow directly with `console.error`; the contents auth entrypoint already had a beacon reporter available.
- Fix: pass a beacon-aware `reportError` callback through the sign-in initializer and invoke it before preserving the console log.
- Next time: test handled promise rejection paths separately from global browser error events.
