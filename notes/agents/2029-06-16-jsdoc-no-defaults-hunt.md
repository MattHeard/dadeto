## Task notes

- Challenge: locating the remaining `jsdoc` violations in `src/core` was tricky because `npm run lint` outputs hundreds of other warnings and hides the `jsdoc/no-defaults` entries.
- Resolution: ran `npx eslint "src/core/**/*.js" --format json` and parsed the results with Node to isolate the `jsdoc` rules before applying the fix in `mark-variant-dirty-core.js`.
