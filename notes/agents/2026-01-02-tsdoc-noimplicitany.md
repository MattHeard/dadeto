# TSDoc noImplicitAny sweep

- **Hurdle:** Re-enabling `checkJs` alongside `noImplicitAny` immediately floods `tsdoc:check` with the legacy `unknown`/`object` issues, which was expected but bigger than I remembered; the trick was not to chase them all now but to capture the first few so future beads can pick them off.
- **Work:** Turned `checkJs` back on, introduced `noImplicitAny`, re-ran `npm run tsdoc:check` (see `tsdoc-check-output.txt`/`tsdoc-check-current.log`), and recorded the earliest failures so the new issues cover the remaining files instead of burying the global log.
- **Next steps:** The follow-up beads `dadeto-8t7`, `dadeto-ej0`, `dadeto-ycn`, and `dadeto-ho5` cover the first data/localStorage, moderation, presenter, and toy modules that now refuse to compile.
- **Open questions:** Should we keep `checkJs` on going forward so each strict flag has immediate signal, or would staging smaller subsets (e.g., `core/browser` first) keep the noise manageable while we chip away?
