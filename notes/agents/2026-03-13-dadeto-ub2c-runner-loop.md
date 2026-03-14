# dadeto-ub2c (runner loop 2026-03-13)
- unexpected hurdle: the remaining cross-handler duplication slice lived in the capture-form builder scaffolding rather than the shared listener block that was already extracted.
- diagnosis path: reran `npm run duplication`, confirmed the shared destructuring/update block still reported as a clone, and evaluated how each handler consumed the `onFormReady` callback arguments.
- chosen fix: added `getCaptureFormContext` in `captureFormShared.js` so both handlers can consume the same destructured DOM/button/container inputs and keep their own wiring logic distinct.
- next-time guidance: if the shared builder signature still looks duplicated after wiring helpers, consider expanding the helper’s return bundle before adding more handler-specific setup so the detector sees a single call site.
