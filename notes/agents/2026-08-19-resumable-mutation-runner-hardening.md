# Resumable mutation runner hardening

- Unexpected hurdle: the aggregate check still has host-level `EPERM` failures for child Node processes, plus pre-existing lint, duplication, TSDoc, and audit failures outside this change.
- Diagnosis: the scanner had no durable per-file outcome record and treated timeout/failure as a scan-stopping error; stale Stryker sandboxes also polluted Jest discovery.
- Fix: use a dedicated all-tests mutation Jest config with serial workers and sandbox exclusion; continue after timeout/failure; persist per-file clean, survivor, no-test, timed-out, and failed records; clean stale scanner sandboxes after lock acquisition; retain bounded runner reuse and Stryker's 10-second mutant timeout.
- Next time: resume from `reports/mutation/core-mutant-scan.json`; retry records with `timed_out` or `failed` status, and inspect the structured check summary separately from host policy failures.
