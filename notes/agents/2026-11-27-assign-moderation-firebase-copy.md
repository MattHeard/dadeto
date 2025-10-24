# Assign moderation Firebase app copy

- **Challenge:** Needed to mirror the shared Firebase app initializer without breaking localized state handling.
- **Resolution:** Duplicated the initialization helper directly into the assign moderation job package, preserving its defensive duplicate-app checks.
