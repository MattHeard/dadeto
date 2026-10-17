# Optional Zod test-double schema parity

- **Unexpected hurdle:** The local Zod test double returned internal schema
  objects from toJSONSchema; existing tests only checked that the mechanism
  schema had four oneOf entries, so the mismatch stayed hidden.
- **Diagnosis:** Comparing createInterpretabilitySchemasV1 output from real
  Zod v4 and createTestZod() found 98 structural differences across six
  schemas. The fallback parser suites passed, but that did not verify generated
  JSON Schema or prove the forced fallback was selected.
- **Chosen fix:** Implement the JSON Schema subset used by the production
  interpretability factory and make the fallback date-time check match its
  strict ISO UTC contract. Add a contract suite that compares the full generated
  schema when Zod is available and separately proves forced fallback selection.
  Production code remains dependency-injected and imports no Zod package.
- **Evidence:** Focused interpretability suites passed 34/34 with installed
  Zod and 34/34 with DADETO_TEST_WITHOUT_ZOD=1; targeted ESLint passed.
  The full `npm run check` later passed with exit 0, all four coverage metrics at
  100%, and zero clones. Bead dadeto-kzm8 is closed with that evidence.
- **Next-time guidance:** Keep the contract suite aligned with actual factory
  methods. When the optional Zod package is installed, compare complete schema
  output; also run the forced fallback path so test results do not depend on
  which optional packages happen to be present.
