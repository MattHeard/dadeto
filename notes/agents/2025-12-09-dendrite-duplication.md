The remaining clone between `transformDendriteStory` and `addDendritePage` was caused by duplicated parsing, validation, and persistence helpers. I split that logic into two shared modules—`toys/dendrite-input.js` (JSON parsing + validators) and `toys/dendrite-storage.js` (cloning/saving the temporary DEND2 state plus building responses)—then replaced each toy with a lightweight wrapper that just wires its payload into the shared helpers.

This reshuffle also simplified the toy files, eliminated the repeated import block, and shrank the duplication report such that `npm run duplication` no longer reports any clones at the tuned min‑token threshold. Lint was kept happy by moving persistence steps into focused helpers and annotating the new exports before running the checks again.

Testing:
- `npm run duplication`
- `npm run lint`
- `npm test`

Next: there are no outstanding duplication findings right now, so future work can focus on new toy features or broader refactors.

Side note: after the duplication work I moved `safeParseJson`, the validators, and the persistence helpers into `src/core/browser/toys/browserToysCore.js` so a single file can power both toys and the old helper modules became unnecessary.

Additional cleanup: the shared container-handler invocation pattern used by `textHandler` and `numberHandler` became a minor duplication report once `minTokens` dropped to 40, so I extracted `invokeContainerHandlers` into `src/core/browser/inputHandlers/browserInputHandlersCore.js` and wired both handlers through that helper before calling their individual cleanup lists.
