Unexpected hurdle: the Google Identity callback path was already returning a promise, so Firebase sign-in failures surfaced as unhandled rejections and got reported as client errors.

Diagnosis: the Cloud Error Reporting entry with insertId `fjqee0esogfg` pointed to `unhandledrejection` in `admin-core.js`, and the stack traced into the browser admin sign-in flow.

Fix: catch the callback promise in `initializeGoogleSignIn`, log the failure, and keep the bootstrap from rejecting. Updated the browser auth test to match the non-throwing behavior.

Next time: when a browser auth stack starts showing up in Error Reporting, check whether the callback boundary is returning a promise without a rejection handler before chasing Firebase internals.
