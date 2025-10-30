# Render variant JSDoc cleanup

- **Challenge:** The render-variant core module destructures large dependency objects, and ESLint's JSDoc rules require explicit type + description entries for every nested property. The existing comments were empty blocks, so ESLint reported missing `@param`/`@returns` tags for the whole file.
- **Resolution:** Added detailed structural types and descriptions for each dependency and helper, including nested Firestore/Storage shapes, and documented the async return values. This cleared the jsdoc warnings without changing runtime behavior.
