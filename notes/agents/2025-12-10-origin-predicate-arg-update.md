# Origin predicate argument update

## Summary
- Added an explicit allowed origins argument to the `isAllowedOrigin` helper to make dependency injection straightforward.
- Verified that the middleware now passes the configured `allowedOrigins` list into the predicate.

## Challenges & Resolutions
- Ensured the helper stayed pure by avoiding direct access to the module-level configuration inside the predicate.
