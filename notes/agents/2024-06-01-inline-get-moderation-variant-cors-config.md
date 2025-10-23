# Inline get-moderation-variant CORS config

- **Challenge:** The moderation variant function relied on a shared `getAllowedOrigins` helper, but inlining the logic required keeping the existing behaviour for production and Playwright test environments without duplicating mistakes.
- **Resolution:** Copied the existing origin resolution logic directly into the entrypoint, preserving the production origin list and conditional Playwright handling before wiring it into the Express CORS middleware.
