# Duplication gate hard failure

Unexpected hurdle: jscpd kept exiting 0 even when it reported duplicate blocks in the JSON report.

Diagnosis: the raw scanner output looked like a warning-only report, so the aggregate check could not tell that clones should fail the gate.

Chosen fix: wrap jscpd in a small script that reads reports/duplication/jscpd-report.json and exits nonzero whenever any clone is present, then update the quality docs to describe that clone reports are hard failures.

Next-time guidance: when a third-party checker prints results but exits 0, prefer a tiny repo-owned wrapper so the gate policy is explicit and testable.
