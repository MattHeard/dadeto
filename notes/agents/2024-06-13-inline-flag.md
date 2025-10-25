# Inline Firebase reset handler

## Challenges
- Needed to inline the `clearFirebaseInitializationFlag` helper without altering runtime behavior.

## Resolution
- Replaced the helper assignment with an inline arrow function that directly resets the initialization flag.
