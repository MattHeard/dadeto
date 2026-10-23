# AlgZoo stored coverage-cost report

- **Unexpected hurdle:** The first focused evaluator found formatting warnings, a report-validation clone, and one test expectation that used the wrong target column value.
- **Diagnosis:** The report boundary repeated indexed validation-return structure and duplicated the paired-record shape checks. The nonfinite formatting test also expected an output fragment that did not match the table's target-first column order.
- **Chosen fix:** Share stable validation-error construction, keep report validation specific to the analyzer output shape, and test the actual first target row. The command reads one saved JSON input and only prints sanitized Markdown; tests use synthetic records.
- **Next-time guidance:** For saved-record commands, exercise the core injected command and the executable CLI separately. Confirm coverage output includes every changed core file, and inspect jscpd's exact clone fragment rather than suppressing it.
