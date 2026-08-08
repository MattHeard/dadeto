# Symphony bootstrap coverage

- Unexpected hurdle: the bootstrap suite was already nearly complete, with one missing status-preservation branch.
- Diagnosis: prior launch attempts are preserved only when their outcome is `failed`; successful attempts must be discarded during refresh.
- Fix: added a refresh test with a successful previous launch attempt and asserted it is omitted from the resulting status.
- Next-time guidance: for state-merging code, test both preservation and deliberate discard paths for each optional nested status object.
