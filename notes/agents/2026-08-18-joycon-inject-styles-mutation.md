# Joy-Con style injection mutation coverage

- Unexpected hurdle: `injectStyles` had four survivors because its large CSS payload was only exercised indirectly.
- Diagnosis: no direct test proved style creation, CSS content, or attachment to the form.
- Fix: exported `injectStyles` through the test-only surface and asserted the style element, mapper CSS, and form attachment.
- Evidence: focused Jest passed 81/81; Stryker scan for lines 1905-2010 killed 4/4 mutants; targeted ESLint and diff check passed.
- Next-time guidance: isolate static-template helpers by asserting their executable boundaries and one meaningful template marker.
