## Summary
- Adjusted the assign moderation GCF shim to expose Firebase Functions via a dedicated `functions` export while keeping other helpers as direct named exports.
- Updated the Cloud Function entry point to consume the namespace export explicitly so the Firebase helpers stay isolated from the shimmed utilities.
- Verified that the refactor leaves the existing initialization and route wiring code untouched beyond the import reshuffle.
