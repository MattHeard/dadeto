# Assign moderation job cors cleanup

- **Challenge:** Needed to align the CORS configuration with other cloud functions by omitting the unused `allowedOrigins` property without disrupting the origin handler.
- **Resolution:** Verified the origin handler only requires the computed list at creation time and updated the options object to include just `origin` and `methods` before applying it to the Express app.
