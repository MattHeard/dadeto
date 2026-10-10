# Render-variant Storage effects

- Unexpected hurdle: the first full check found that the local GCP simulator constructs the render-variant handler without its newly required Storage adapter.
- Diagnosis: the cloud entry point injected the adapter, while the simulator boundary only supplied the effects token factory; its render configuration therefore failed dependency validation.
- Fix: added a local Storage adapter and injected it through the public simulator wrapper into the core simulator configuration. Kept the simulator adapter outside `src/core`.
- Next-time guidance: when making a core dependency mandatory, inspect simulator and local harness composition as well as production entry points; verify all full-check test shards rather than only focused suites.
