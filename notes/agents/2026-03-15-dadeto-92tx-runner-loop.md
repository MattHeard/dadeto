# dadeto-92tx runner loop

- unexpected hurdle: `tsdoc:check` still reported the next `gamepadCapture` mismatch even after the previous guard slices, so I had to re-read the file to see which runtime paths still let a nullable payload slip through.
- diagnosis path: traced the latest log to the `emitToyPayload` helper and noticed the JSDoc promised a non-null payload even though multiple call sites were guarding on `null`, so the type checker could still see `payload` as nullable inside the helper.
- chosen fix: widened the `emitToyPayload` param to `Record<string, unknown> | null`, destructured the values, and kept the guard so `syncToyInput` is only invoked once the payload has been narrowed.
- next-time guidance: the existing `joyConMapper` errors still dominate `npm run tsdoc:check`, so rerun that script after landing each helper-scope fix to keep the queue ordered and to prove `gamepadCapture` is clean before moving on.
