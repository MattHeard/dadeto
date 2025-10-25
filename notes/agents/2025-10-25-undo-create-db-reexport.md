# Undo createDb re-export

- Restored the Cloud createDb helper to its own implementation instead of re-exporting the core version.
- Updated the unit test to verify both implementations construct Firestore instances independently.
- Re-ran the Jest suite to ensure all cloud tests succeed after the change.
