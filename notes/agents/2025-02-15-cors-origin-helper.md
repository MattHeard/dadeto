# Assign moderation job CORS origin refactor
- **Challenge:** Needed to expose the CORS origin handler creation as a reusable helper without re-initializing Firebase resources during tests.
- **Resolution:** Extracted a pure function in the Cloud Function entry module that composes the existing core factory with the environment getter, allowing the origin handler to be built without touching the rest of the setup.
