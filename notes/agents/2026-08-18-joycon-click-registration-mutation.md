# Joy-Con click registration mutation coverage

- Unexpected hurdle: the click-registration helper had four survivors because no test exercised its event binding and disposer lifecycle directly.
- Diagnosis: downstream UI tests did not prove the event type, handler identity, or removal callback.
- Fix: exported `registerClick` through the test-only surface and asserted registration plus exact disposer removal behavior.
- Evidence: focused Jest passed 76/76; Stryker scan for lines 1892-1896 killed 4/4 mutants; targeted ESLint and diff check passed.
- Next-time guidance: test registration helpers as lifecycle pairs: add, retain identity, then remove.
