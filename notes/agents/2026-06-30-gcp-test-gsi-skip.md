Unexpected hurdle: Cloud Playwright runs were failing inside the browser bootstrap with Google Identity Services rejecting the internal ILB origin, which left moderation/new-story half-initialized.

Diagnosis: the failing run logs showed `The given origin is not allowed for the given client ID`, and the cloud bundle was still initializing Google sign-in unconditionally on `PLAYWRIGHT_BASE_URL`.

Chosen fix: thread a `disableGoogleSignIn` flag through `config.json`, then gate Google sign-in initialization in the static entrypoints and admin bootstrap so `t-*` environments can run without GIS.

Next time: if cloud-only auth or origin failures appear again, check the deployed static config and page bootstrap first before changing the moderation or submission flows themselves.
