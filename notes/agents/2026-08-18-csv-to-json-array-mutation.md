# 2026-08-18: CSV-to-JSON array mutation slice

- Unexpected hurdle: public JSON output collapsed several invalid-input branches to the same empty-array result, leaving 16 survivors despite broad tests.
- Diagnosis path: reran the file and mapped survivors to CR-only normalization, trailing-line handling, header extraction, blank rows, and whitespace-only quoted values.
- Chosen fix: added CR-only and whitespace cases, exposed narrow helper contracts for focused tests, and removed equivalent fallback/length branches while preserving the public output.
- Evidence: focused Jest 13/13, lint clean, and Stryker 91/91 killed with 0 survivors, 0 timeouts, and 0 no-coverage.
- Next-time guidance: when a public serializer erases distinctions, test the private parsing contract directly or refactor the erased branch into an explicit sentinel.
