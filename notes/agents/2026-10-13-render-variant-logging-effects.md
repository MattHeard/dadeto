# Render-variant logging effects

- Unexpected hurdle: the full quality gate exposed an uncovered no-op logger branch and capability-capture/parameter-arity lint findings in renderer error paths.
- Diagnosis: the default logger needed an explicit permission parameter for the function coverage and effect-boundary model; nested promise callbacks also hid where the request capability was used.
- Fix: thread `AllowEffects` through renderer logging, use explicit `try`/`catch` error paths, and keep grouped dependencies in option objects. Focused renderer coverage and the full check passed.
- Next time: when changing injected effect signatures, search all renderer and tree-visibility call sites first, then run focused tests, `npm run check`, cloud packaging, and syntax checks before closing the bead.
