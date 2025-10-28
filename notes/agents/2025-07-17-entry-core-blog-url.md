# Entry/Core blog URL injection tweak
- **Challenge:** Needed to expose the blog JSON path through dependency injection so entry layers control external resources instead of core code hard-coding paths.
- **Resolution:** Added a helper in the core data module that respects injected `getBlogUrl`/`blogUrl` values and updated the browser entry to provide its path, plus a regression test confirming the override is used.
