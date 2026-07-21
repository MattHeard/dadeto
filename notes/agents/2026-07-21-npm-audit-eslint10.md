# npm audit and ESLint 10 upgrade

- Unexpected hurdle: the dependency upgrade exposed stricter JSDoc diagnostics, and the simulator's recursive local trigger fixture needed a bounded re-entry guard.
- Diagnosis: `npm audit --json` identified ESLint 9 and transitive `js-yaml`, `brace-expansion`, and related dependency paths; targeted simulator tests isolated the recursive fixture behavior. The full check initially also exhausted `/tmp` Jest cache space and exposed existing uncovered cloud branches.
- Chosen fix: upgrade ESLint and compatible plugins, pin patched transitive dependencies, preserve the established JSDoc baseline, bound same-path simulator re-entry, and add focused coverage for the cloud/tree-visibility edge paths.
- Next-time guidance: clear only `/tmp/jest_rs` after an ENOSPC failure and use `DADETO_COVERAGE_SHARD_SIZE=100 npm run check` for this repository's current Node 24 environment.
