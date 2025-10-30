# Undefined JSDoc type for process env

- **Surprise:** `npm run lint` flagged `NodeJS.ProcessEnv` in `src/cloud/common-gcf.js` as an undefined JSDoc type. I expected the Node.js ambient types to be available automatically in plain JS, but eslint's JSDoc validation still requires an explicit alias.
- **Debugging:** Confirmed the warning by opening the file and spotting the `@returns {NodeJS.ProcessEnv}` annotation. Rather than touching runtime code, I checked the Node typings and found the `ProcessEnv` interface exported from `node:process`, which can be pulled into JSDoc via `import()`.
- **Takeaway:** When a JSDoc type comes from ambient Node declarations, add an explicit typedef import to keep eslint happy. Pattern: `/** @typedef {import('node:process').ProcessEnv} ProcessEnv */` near the top of the module, then reference `ProcessEnv` in the JSDoc block. This keeps tooling aware of the type source without affecting runtime behavior.
- **Follow-ups:** None—the lint warning disappears after the typedef, but we should remember to capture additional ambient types the same way if future warnings appear.
