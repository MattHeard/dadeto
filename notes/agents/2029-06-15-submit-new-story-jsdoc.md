# Submit new story JSDoc cleanup

- **Challenge:** The submit-new-story core module exposes numerous helpers with destructured arguments, which eslint reports as missing param docs. The jsdoc/tag-lines rule also rejects blank lines between summaries and tags, so I had to adjust formatting while documenting nested shapes.
- **Resolution:** Introduced typedefs for the request, response, and dependency records so each helper can reference concise names. Added targeted `@param`/`@returns` annotations without triggering the default-value restriction, ensuring eslint now reports only the pre-existing complexity warnings.
