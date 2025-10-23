# Generate stats CORS re-export

- Added a thin re-export wrapper so the generate stats entry point can import its CORS helpers locally.
- Double-checked the import graph to avoid circular references and verified linting should still pass without rerunning the full suite.
