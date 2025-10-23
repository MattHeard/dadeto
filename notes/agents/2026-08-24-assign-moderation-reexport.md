# Assign moderation Firebase app re-export

- **Challenge:** Needed to re-export the shared Firebase app utilities within the assign moderation job module without duplicating logic.
- **Resolution:** Added a thin re-export wrapper and updated local imports to use it, ensuring the job package references its own entry point while still sharing the underlying implementation.
