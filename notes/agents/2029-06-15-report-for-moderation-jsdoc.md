# Report For Moderation JSDoc Cleanup

## Challenges
- ESLint's jsdoc rules flagged both missing type annotations and formatting issues, and the default type syntax I used (`readonly string[]`) was not accepted.

## Resolutions
- Replaced the unsupported type syntax with plain `string[]` unions and documented the default value in prose to satisfy `jsdoc/no-defaults`.
- Removed blank spacer lines between JSDoc descriptions and tags to satisfy the `jsdoc/tag-lines` rule.
