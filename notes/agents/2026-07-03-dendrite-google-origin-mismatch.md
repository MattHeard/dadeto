# Dendrite Google origin mismatch

- Unexpected hurdle: production Google sign-in failed with `Error 400: origin_mismatch` even though the repo already allows `www.dendritestories.co.nz` in Terraform for Identity Platform and CORS.
- Diagnosis path: checked the deployed host, the browser auth module, and the infra config. The live site is served from `https://www.dendritestories.co.nz/`, and the repo does not manage the Google OAuth client's JavaScript origin allowlist.
- Chosen fix: record the boundary explicitly instead of changing browser auth code. The required change is in Google Cloud Console for the OAuth client attached to `GOOGLE_OAUTH_CLIENT_ID`, not in the repo's `authorized_domains` setting.
- Next-time guidance: when Google sign-in returns `origin_mismatch`, verify the OAuth client's authorized JavaScript origins separately from Identity Platform authorized domains. If the app can also be reached on the apex domain, include that origin too.
