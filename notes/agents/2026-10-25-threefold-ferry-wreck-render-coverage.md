# Threefold ferry-wreck renderer coverage

- Unexpected hurdle: a hand-built witness ledger entry failed normalization because it omitted the canonical time, knowledge, and consequence fields.
- Diagnosis: the renderer maps every ledger entry through the production witness presenter before checking the ferry-search disclosure.
- Fix: exercise the real aftermath interaction reducer to create a valid `ferry-wreck-search` event, then assert the accessible renderer disclosure.
- Evidence: focused renderer Jest passed 51 tests; focused branch coverage confirms both `hasFerryWreckSearch` outcomes are hit (`[79,77]`). The full local check is still running and must be recorded before closure.
- Next time: construct witness-ledger fixtures through the reducer or canonical normalizer instead of hand-authoring partial entries.
