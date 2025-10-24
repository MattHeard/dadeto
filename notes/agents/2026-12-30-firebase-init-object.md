# Firebase initialization object

## What changed
- Grouped the Firebase initialization helpers into a shared object so tests can stub or inspect state without juggling standalone exports.

## Challenges & Resolutions
- **Ambiguous request wording**: The instruction only said to "group" the helpers, so I double-checked existing usage to avoid breaking imports and kept wrapper functions while exposing the new object explicitly.
