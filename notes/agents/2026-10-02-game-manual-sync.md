# Game manual manifest synchronization

The post-WebMCP full aggregate check completed with exit 1 and three failing
gates: manuals:check, core-parse, duplication. Its log is
`.tmp/check-after-game-webmcp.log`. All four coverage metrics were exactly 100%:
lines 19969/19969, statements 20756/20756, functions 6835/6835, branches 9885/9885.
The thin-adapter gate passed with no exemptions.

The new WebMCP manual section must also appear verbatim in the blog manifest.
The sync helper repairs this but also reorders other posts' logical content
arrays. Retained only the Mosslight markdown update and restored every unrelated
post's original order and metadata. The final blog manifest diff changes one
manual string, not the layout of other toys.

`npm run manuals:check` now passes (75 manuals), and `npm run build` passes.
Logs: `.tmp/mosslight-webmcp-manuals.log` and `.tmp/mosslight-webmcp-build.log`.
Static aggregate rerun: `.tmp/check-static-after-manual-sync.log` (tests deliberately
retained from the full run rather than substituted with a static-only claim).

Next-time guidance: manual edits require both filesystem docs and manifest text;
preserve the content array's existing logical order while synchronizing. All
remaining parser/duplication work is still owned by dadeto-aaou. No complete-green
claim or bead closure follows from this manual fix.
