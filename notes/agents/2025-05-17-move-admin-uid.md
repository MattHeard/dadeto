# Moving ADMIN_UID into common-core

- **What surprised me:** I expected the admin UID constant to have only a single consumer, but it fans out through several re-export layers (browser, cloud, and tests). A direct move would have broken those imports if I deleted `src/core/admin-config.js` outright.
- **How I handled it:** I centralized the literal in `common-core.js` and converted `admin-config.js` into a re-export so the existing module graph keeps working without noisy import churn. I also double-checked that Jest still uses that constant via the admin browser bundle to catch regressions.
- **What I'd do differently next time:** Inspect for wrapper modules before relocating shared values—`rg` made it clear that the value propagates widely. Building that inventory first saves time spent untangling import errors later.
- **Follow-up question:** Are there more shared constants that belong in `common-core.js`? If so, it might be worth planning a broader consolidation pass instead of these single moves.
