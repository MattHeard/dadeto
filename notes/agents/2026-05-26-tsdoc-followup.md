Unexpected hurdle: the tsdoc checker is not failing on one or two shared helpers anymore; it now mostly points at a handful of browser capture and toy modules with stricter local typings.

Diagnosis path: I cleared the shared disposer and dependency-wrapper issues first, then reran `npm run tsdoc:check` repeatedly to confirm which files still dominated the output.

Chosen fix: narrowed a few helper types in `gamepadCapture.js`, `createDendriteHandler.js`, `captureFormShared.js`, `captureLifecycleToggle.js`, and several small toy helpers so the checker could advance past the initial cluster.

Next-time guidance: continue with the remaining browser capture/presenter/toy files in small batches, starting with the files that appear most often in the latest checker output.
