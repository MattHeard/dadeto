# Blog manual standalone links

- Unexpected hurdle: canonical toy manuals used valid Markdown links, but the blog lazily inserted their source into a `<pre>` with `textContent`, so readers saw the link syntax instead of a clickable destination.
- Diagnosis: standalone pages existed for Mosslight Valley, Chronoflow, Neon Covenant and The Commons of Tomorrow. Only the last two manuals contained links; the manual client did not render any Markdown.
- Fix: render only Markdown link tokens as DOM anchors, keep labels and all remaining manual prose as text, and accept only HTTP(S) destinations. Style links as underlined, keyboard-focusable links. Add missing standalone URLs to the Mosslight Valley and Chronoflow manuals and validate all four destinations in `manuals:check`.
- Verification: focused manual and generator Jest suites pass (18 tests); `npm run manuals:check`, focused ESLint and `npm run build` pass. Sandboxed `npm run check` failed because Jest and core-parse subprocesses returned `EPERM`, while npm audit exited 1. The escalated check produced no output beyond test startup for over a minute and had no active child process, so it was interrupted without a terminal result.
- Next time: when manuals are loaded as text, test that Markdown destinations become actual anchors, that unsafe schemes remain inert text, and that every standalone game manual links to its page.
