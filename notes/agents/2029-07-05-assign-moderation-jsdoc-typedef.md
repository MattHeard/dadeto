# Assign Moderation CORS typedef clean-up

## Challenges
- eslint's `jsdoc/valid-types` rule rejected the inline arrow-function return types that described the nested CORS factories. The type expression became unreadable and caused the lint failure we were asked to fix.

## Resolutions
- Introduced dedicated typedef aliases (`ResolveAllowedOrigins`, `CorsOriginHandler`, etc.) at the top of `assign-moderation-job-core.js`. The aliases keep the signatures precise while satisfying the parser, which cleared the lint warning without touching runtime behavior.
