# Origin predicate refactor

## Challenges
- Ensuring the extracted predicate stayed pure and reusable without altering existing CORS behavior.

## Resolutions
- Introduced a small helper that only depends on the shared `allowedOrigins` list and reused it inside the middleware check.
