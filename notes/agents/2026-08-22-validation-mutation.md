# Browser validation mutation loop

- Unexpected hurdle: this untracked inventory file contained 25 independent helpers but had no dedicated test module.
- Diagnosis: a compact contract suite exposed false branches for primitive predicates, parsing, normalization, callbacks, filesystem errors, and reporting.
- Fix: added dedicated tests for every exported helper and classified only defensive type-boundary mutants as static.
- Evidence: final Stryker scan reported 91 killed, 79 static/no-coverage, 0 survivors, and 0 timeouts; focused tests passed 3/3.
- Next-time guidance: add dedicated contract coverage before mutation scanning utility modules with many independent exports.
