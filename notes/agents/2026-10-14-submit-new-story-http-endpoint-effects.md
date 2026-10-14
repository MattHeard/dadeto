# Submit New Story HTTP Endpoint Effects

- **Unexpected hurdle:** `createCloudHttpEndpoint` in `src/core` directly called Express middleware and route registration plus Cloud Functions HTTPS registration, leaving those startup commands without an explicit `AllowEffects` capability.
- **Diagnosis:** The cloud entry point passed endpoint pieces into the shared core helper, so tracing only the request handler missed the synchronous startup effects.
- **Chosen fix:** Keep endpoint composition in core, but inject token-first adapters for middleware, route, and HTTPS function registration from the submit-new-story cloud boundary. Move those small startup adapters to the existing startup adapter module after `npm run check` identified the 50-line non-core file limit.
- **Evidence:** Focused ESLint passed; `npm run non-core-thin` passed (326 JS files, 2 baseline exemptions); `npm run build:cloud` passed; `DADETO_CHECK_TIMEOUT_MS=3600000 npm run check` passed all 10 gates, including 11 local E2E tests and zero clones.
- **Next-time guidance:** Audit shared wiring helpers for startup-time SDK/framework calls as well as request-time effects, and run the thin-file gate after adding boundary adapters.
