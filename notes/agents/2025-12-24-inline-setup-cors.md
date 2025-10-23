# Inline assign moderation CORS helper

- **Challenge:** Removing the `createSetupCors` helper from the cloud entry point while keeping the middleware options identical to the shared core implementation.
- **Resolution:** Recreated the CORS options object locally in the entry module before applying `cors` so the endpoint still uses the origin factory and enforces `POST` requests.
