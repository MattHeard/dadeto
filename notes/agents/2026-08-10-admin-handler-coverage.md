# Admin handler coverage follow-up

- Added direct tests for memoization and unavailable-auth failure in `createInitGoogleSignInHandlerFactory`.
- These cases target the remaining uncovered factory branches reported by the aggregate coverage artifact.
- The first aggregate attempt exposed and the focused rerun fixed an incomplete Google provider test fixture.
