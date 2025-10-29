## Summary
- Removed the legacy coverage sweep test per maintainer request.
- Captured the real coverage report to surface actual branch coverage gaps.

## Reflections
Removing the counter-munging suite dropped overall branch coverage below thresholds, revealing large swaths of unexecuted cloud code. Future work needs targeted integration tests for those modules rather than synthetic coverage padding.
