# Me link reload regression

- Unexpected hurdle: the deployed Dendrite auth module had drifted from the current source and omitted profile-link wiring.
- Diagnosis: `Sign out` was driven by the cached ID token, while `Me` required a separately cached author UUID.
- Fix: refresh the author UUID on signed-in page load and update the profile link after the refresh; keep the Dendrite artifact aligned.
- Next time: compare `src/browser/contentsGoogleAuthModule.js` with `infra/browser/contentsGoogleAuthModule.js` before investigating endpoint behavior.
