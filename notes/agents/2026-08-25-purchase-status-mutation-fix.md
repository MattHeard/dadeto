# Purchase status mutation scan

- Unexpected hurdle: header-regex mutants required malformed, anchored, case-insensitive, and repeated-whitespace fixtures to distinguish them.
- Diagnosis: exact pending/paid response assertions killed payload mutations; custom token-verifier fixtures distinguished anchored Bearer parsing from arbitrary header replacement.
- Fix: added exact invalid-session and paid responses plus malformed-header, lowercase, double-space, and non-string authorization assertions. The final scan killed all 48 mutants.
- Next time: test authentication parsers with both malformed prefixes and multiple whitespace forms.
