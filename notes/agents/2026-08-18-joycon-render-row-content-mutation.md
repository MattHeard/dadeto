# Joy-Con row content mutation coverage

- Unexpected hurdle: after row-class coverage was fixed, six row-content mutants remained, including the `div` tag literals for the name and value elements.
- Diagnosis: broad DOM call assertions did not prove which element creation call used each tag or that the rendered value was attached in the expected position.
- Fix: strengthened the render-list test with positional tag, class, text, and list-attachment assertions.
- Evidence: focused Jest passed 73/73; Stryker scan for lines 1432-1443 killed 6/6 mutants; targeted ESLint and diff check passed.
- Next-time guidance: assert ordered DOM construction calls when generic mocks allow mutated arguments to be masked by later identical calls.
