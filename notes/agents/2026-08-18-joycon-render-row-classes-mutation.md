# Joy-Con row class mutation coverage

- Unexpected hurdle: `renderMapperList` had five surviving mutants in the row-state class condition despite helper-level row-state tests.
- Diagnosis: the tests asserted the derived state but never exercised the DOM class decision for both active and optional rows.
- Fix: exported `renderMapperList` through the test-only surface and added a focused test asserting that an active row gets `active` while optional rows do not receive `optional`.
- Evidence: focused Jest passed 73/73; Stryker scan for lines 1427-1430 killed 5/5 mutants; targeted ESLint and diff check passed.
- Next-time guidance: when row-state logic is rendered into DOM classes, test the class side effect separately from the state helper.
