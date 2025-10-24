# Static Firestore Import Adjustment

- **Challenge:** Updating the handler to use a static Firestore import required ensuring the lazy initialization logic still returned a promise-compatible value for existing async consumers.
- **Resolution:** Swapped the dynamic import for a top-level `Firestore` import and cached the created instance while preserving the async wrapper so existing `await` calls continue to function.
