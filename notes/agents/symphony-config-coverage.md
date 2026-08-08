# Symphony config coverage

- Unexpected hurdle: the broader Symphony test imports a runtime-version module containing `import.meta`, so it cannot be used as the config coverage harness.
- Diagnosis: `config.js` is independently testable through its normalization and injected-file-loading APIs.
- Fix: added direct tests for defaults, custom and malformed nested sections, resolved paths, positive-number fallbacks, and the default-argument failure path.
- Next-time guidance: test configuration modules directly when application-level imports introduce unrelated runtime or module-format constraints.
