# Hide Variant HTML JSDoc cleanup

- **Challenge:** The lint run flagged `src/core/cloud/hide-variant-html/core.js` with an invalid JSDoc type because the inline object signature used nested generics that the ESLint JSDoc parser could not understand. After simplifying the type, the linter started requiring property and parameter descriptions.
- **Resolution:** Introduced explicit `@typedef` declarations for the payload and loader result, added short descriptions for each field, and clarified the dependency parameters. The new typedefs keep the contract readable while satisfying the lint rules without changing runtime behavior.
