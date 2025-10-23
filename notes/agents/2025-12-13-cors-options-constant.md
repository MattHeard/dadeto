# 2025-12-13 Extract CORS options object

## Summary
- Pulled the CORS middleware options into a named constant so the configuration is easier to inspect and extend.
- Double-checked that the origin handler factory remains unchanged and still receives the allowed origins list explicitly.

## Challenges
- Ensured the refactor remained a pure extraction without altering middleware behavior; verified the object contents matched the previous inline literal.
