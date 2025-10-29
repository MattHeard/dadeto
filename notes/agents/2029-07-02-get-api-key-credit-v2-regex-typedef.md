# Regex exec array typedef

## Context
- Cleaned up jsdoc warnings in `src/core/cloud/get-api-key-credit-v2/get-api-key-credit-v2-core.js`.

## Challenges
- The handler annotates `UUID_PATH_PATTERN.exec` with `RegExpExecArray`, but eslint-jsdoc flagged the type as undefined in plain JavaScript modules.

## Resolution
- Added a local typedef that describes the shape of the regex result (string array with index/input/groups metadata) so we can keep the existing return signature without changing runtime behavior.
