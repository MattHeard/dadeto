# Get API Key Credit V2 refactor

- Had to move Jest unit tests into a new `tests/` tree per the request and double-check the relative import path back to `src/core`; verified Jest still discovers the suite after adding `@jest/globals` for access to `jest.fn` in ESM.
- Updated the copy-to-infra build script to pull the real core handler rather than the local re-export so deployments pick up the injected version.
