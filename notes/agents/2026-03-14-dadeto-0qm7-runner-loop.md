# 2026-03-14 dadeto-0qm7 runner loop
- unexpected hurdle: `gamepadCapture` in the published assets pulled `makeCaptureFormBuilder` while `public/core/browser/inputHandlers/captureFormShared.js` still exposed only the legacy helpers, so browsers hit an import error.
- diagnosis path: verified the stack trace, confirmed `src/` already had the new shared helpers, and reran `npm run build:mattheard-net` so `public/` copies matched again.
- chosen fix: committed the regenerated `public` capture-form helpers and handler wiring, reran `npm test`, and added this bead evidence via `bd comments` before closing the bug.
- next-time guidance: whenever the shared helper API changes, rebuild (or copy) the `public` bundle immediately so the published assets never drift from `src`.
