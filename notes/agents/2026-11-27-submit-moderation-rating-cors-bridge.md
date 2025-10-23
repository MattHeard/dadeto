# Submit moderation rating cors bridge

- **Challenge:** Needed to expose the shared CORS configuration within the submit moderation rating folder without breaking exi
sting import paths.
- **Resolution:** Added a local re-export module to forward `getAllowedOrigins` and updated the handler to reference it, keeping
 directory-local imports consistent.
