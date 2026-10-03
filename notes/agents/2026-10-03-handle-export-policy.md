# Wrapper handle export policy

The strict report paired the repeated direct exported-handle regex and surrounding
array tails. Sharing the regex alone kept 64 clones. The tightened implementation
uses a shared non-global direct-declaration pattern, and explicit named-export or
direct-declaration checks for export acceptance, preserving short-circuit order.
The successful rerun reduces the strict count 64 to 63. Do not merely rename tails
or stop after the first unchanged scan.

Regression evidence: `.tmp/handle-export-tests.log`, 18 tests in two suites, exact
100% status coverage. Direct declarations match repeatedly with spaces, tabs and
newlines; handleExtra, _handle and Handle remain rejected. Static evidence:
`.tmp/handle-export-static.log`, duplication-only failure at 63. Build evidence:
`.tmp/handle-export-build.log`, passed. Threshold and ignores unchanged; aaou open.
