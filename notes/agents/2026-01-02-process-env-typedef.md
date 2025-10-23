# Process env typedef lint fix

I needed to address an ESLint `jsdoc/no-undefined-types` warning in `src/core/cloud/generate-stats/core.js`.
The project uses `NodeJS.ProcessEnv` in JSDoc, but eslint-plugin-jsdoc does not automatically
resolve that global type here, so the lint run continued to fail. Defining a local typedef that
imports `ProcessEnv` from Node's `process` module let ESLint understand the type reference, and updating
the affected JSDoc annotations to use that alias cleared the warning without changing runtime behavior.
