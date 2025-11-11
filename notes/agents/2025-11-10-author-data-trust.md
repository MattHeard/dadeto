Updated `resolveAuthorMetadata` to treat the Firestore author snapshot as always providing data: the helper now reads `authorSnap.data()` directly and no longer falls back to an empty object, letting corrupted documents fail loudly instead of silently returning without an author URL.

Unexpected hurdle: none—the assumption mirrors what the rest of the pipeline already relies on.

Lesson: when the Firestore contracts already guarantee certain fields, dropping the defensive defaults keeps helpers focused and makes bugs easier to reproduce.

Open questions: none.
