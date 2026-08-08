# GCP simulator server coverage

- Unexpected hurdle: the integration test binds a real Express listener, which is blocked by the execution sandbox.
- Diagnosis: startup and route logic were separable from networking; the missing coverage was in route registration, response-shape handling, redirect handling, and lazy simulator creation.
- Fix: added an injected simulator dependency and a fake Express harness that executes every registered route without opening a socket.
- Next time: keep server startup dependencies injectable so route behavior can be tested independently of port permissions.
