# Load Static Config JSDoc cleanup

- **Challenge:** The lint run flagged missing JSDoc tags in `src/core/browser/load-static-config-core.js`, and browser globals like `RequestInfo` were not recognized by the Node-focused ruleset.
- **Resolution:** Introduced local typedefs to represent the minimal fetch response contract, documented every helper (including inner functions), and avoided DOM-specific types so eslint-jsdoc accepts the annotations.
