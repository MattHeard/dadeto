# npm check gates — 2026-08-04

- Unexpected hurdle: aggregate coverage stopped at 99.652% after the checkout-session refactor, and a terminated run left a stale shared Jest-slot lock.
- Diagnosis: coverage reports identified the exact uncovered branches; the stale lock owner PID no longer existed.
- Fix: added focused tests for checkout validation, provider failures, customer creation, Express responses, and tree-visibility defaults; removed the stale lock after validating its dead owner.
- Next-time guidance: use a bounded coverage shard size and verify `/tmp/dadeto-jest-pool/active/owner.json` before interpreting a silent coverage startup as an OOM or test hang.
