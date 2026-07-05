# Error Reporting Beacon Privacy Note

Unexpected hurdle: the browser error beacon work needed a privacy-safe relay contract, not just a transport change.

Diagnosis: the browser payload had to stay anonymous end-to-end, while the cloud function remained the collector that forwards a synthesized Error Reporting event.

Chosen fix: keep the beacon allowlist narrow, strip URL query strings and fragments, omit user identifiers and user agent data, and synthesize the Error Reporting event server-side with environment-scoped service naming.

Next-time guidance: keep the browser beacon and collector/runtime failure paths documented separately so later changes do not blur who observed the error versus who forwarded it.
