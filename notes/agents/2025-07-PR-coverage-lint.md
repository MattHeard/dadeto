## Summary
- Ensured src/core branch coverage reached 100% by extending assign-moderation job tests.
- Added coverage for request header edge cases to improve verifyAdmin confidence.
- Refactored verifyAdmin helpers to satisfy eslint complexity limits for one warning.

## Challenges
- Achieving lint compliance required splitting helper logic without altering behavior.
- Maintaining readability while covering every branch demanded careful test design to avoid brittle mocks.
