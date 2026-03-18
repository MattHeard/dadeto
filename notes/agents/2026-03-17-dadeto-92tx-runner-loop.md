# Gamepad capture TSDoc mismatch loop
- unexpected hurdle: the requested mismatch was not reproducible in the current revision; the targeted tsdoc check returned clean output for the file-local surface.
- diagnosis path: ran `npm run tsdoc:check -- --pretty false` and filtered for `gamepadCapture` and `src/core/browser/inputHandlers/gamepadCapture.js`; no matches were emitted.
- chosen fix: none needed in this bounded loop because the current source already satisfies the checker for this surface.
- next-time guidance: if this bead reappears, capture the exact tsdoc diagnostic first so the fix can stay file-local and avoid the larger `joyConMapper` backlog.
