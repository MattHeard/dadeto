# JSDoc lint cleanup

- Re-ran ESLint to produce a JSON report so I could script the remaining `jsdoc/*` issues. Parsing the JSON helped confirm the starting count.
- Added detailed documentation blocks across the copy helpers and stats core module; the `jsdoc/no-defaults` rule required moving default descriptions into the text instead of the type signature.
- Introduced local typedefs for the Cloud copy helpers to keep the return type readable and satisfy `valid-types`.
