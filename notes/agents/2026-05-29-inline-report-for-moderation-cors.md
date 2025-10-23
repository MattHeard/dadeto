# Inline report-for-moderation CORS config

The tricky part was confirming the function didn't rely on the local `cors-config.js` beyond the wrapper import. I double-checked `copy-to-infra.js` to ensure the shared config remained available and then imported `getAllowedOrigins` directly inside the function entry point.
