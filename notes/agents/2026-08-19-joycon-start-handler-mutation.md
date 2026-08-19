# JoyCon start-handler mutation slice

- Unexpected hurdle: the start handler initially had four survivors, including an unobservable temporary disposer-array literal.
- Diagnosis: the handler passed a fresh array into the async HID setup even though the runtime already owns the lifecycle disposer list.
- Chosen fix: stored the runtime disposer list on mapper state, passed it through the start handler, and added a boundary test for initialization, payload sync, rendering, and the no-WebHID path.
- Evidence: the verified Stryker scan killed 3/3 mutants with 0 survivors and 0 timeouts; the focused Jest suite passed 93 tests, ESLint passed with zero warnings, and the diff check passed.
- Next-time guidance: keep lifecycle disposers on the shared runtime state so event handlers do not create unobservable cleanup containers.
