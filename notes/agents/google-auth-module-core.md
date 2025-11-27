Pulled the `createGoogleAuthModule` implementation out of `src/browser/googleAuth.js` and surfaced it from `src/core/browser/admin-core.js` so the admin helpers stay the source of truth for Firebase login/sign-out wiring. The browser entrypoint now only imports the module factory and immediately supplies the six dependencies once, which keeps the surface API lean and lets shared tests run against the same helpers the admin UI uses.

Lessons:

- Grouping helpers by responsibility reduces duplication—`createSignOutHandlerFactory` is still the only caller, so moving the surrounding module upstream keeps admin helpers centralized without altering behavior.
- Keeping exports near the bottom of the browser module makes replacement simpler when the implementation moves elsewhere: the public `initGoogleSignIn`/`signOut` exports didn’t change, only the factory location did.

Open question: Should future shared helpers (e.g., for multi-factor sign-in flows) be exposed from `admin-core` so the browser entry points stay thinner?
