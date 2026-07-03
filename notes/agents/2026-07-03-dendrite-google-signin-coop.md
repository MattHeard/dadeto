## Dendrite Google Sign-In COOP fix

- Hurdle: Google sign-in still failed in the browser with `origin_mismatch` and a Firebase `_getIdTokenResponse` error after the earlier auth code fix.
- Diagnosis: the live site was sending `Cross-Origin-Opener-Policy: restrict-properties`, which blocks the Google identity popup flow from communicating back to the opener.
- Fix: switched the load balancer header to `Cross-Origin-Opener-Policy: same-origin-allow-popups` and added a regression test that asserts the deployed infra keeps that setting.
- Next time: if the popup flow breaks again, check the browser headers first before changing Firebase auth code.
