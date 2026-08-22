# Admin auth/access mutation loop

- Unexpected hurdle: the bounded scan exercised invalid dependency and browser-global paths that intentionally throw during mutation.
- Diagnosis: the surviving mutants were in pure auth-user extraction, invalid getter handling, control display, and Firebase setup helpers.
- Fix: added direct assertions for null/undefined users, signed-in/out display states, invalid getters, and exact Firebase configuration.
- Evidence: bounded Stryker scan for lines 2200-2600 reported 0 survivors and 0 timeouts; baseline passed 27 tests.
- Next-time guidance: separate pure helper contracts from browser integration tests so mutation-induced dependency crashes do not obscure survivor evidence.
