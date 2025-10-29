# Blog data controller JSDoc cleanup

## Summary
- Added explicit typedefs for the blog data logger bundle so jsdoc lint no longer flags missing param metadata.
- Documented the dependency normalization helpers and controller factory to clarify the promises/objects they expose.
- Re-ran ESLint over `src/core/` to confirm the blog data file no longer emits jsdoc warnings.
