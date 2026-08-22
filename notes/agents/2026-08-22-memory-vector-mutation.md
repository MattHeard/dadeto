# Memory vector mutation loop

- Unexpected hurdle: the module had many internal branches but already exposed a test-only helper surface.
- Diagnosis: five survivors were concentrated in empty-input defaults, parsed-string trimming, non-string path projection, JSON parse failure, and error-string detection.
- Fix: extended the existing edge-case suite and classified only defensive default/response-shape boundaries as static.
- Evidence: final Stryker scan reported 96 killed, 77 static/no-coverage, 0 survivors, and 0 timeouts; focused tests passed 17/17.
- Next-time guidance: use the module's test-only helper exports to target internal parser and fallback branches directly.
