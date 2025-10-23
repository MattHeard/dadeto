# get-moderation-variant core extraction

- **Challenge:** The CORS origin list lived inline in the function entrypoint, making it harder to share.
- **Resolution:** Broke out the `productionOrigins` array into a new `core.js` helper and imported it back into the function module.
