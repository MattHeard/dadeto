# AllowEffects for clone report writes

- Unexpected hurdle: publishing one scanner report performs four filesystem effects across two injected functions.
- Diagnosis: report generation is a single command after scanning, so its directory creation and three file writes share one command boundary.
- Fix: require a permission on `makeDirectory` and `writeFile`, and forward one boundary-minted token through all report publication calls.
- Next: continue the remaining filesystem/process adapters, including the newly identified Notion Codex launcher injection.
- Verification: focused scanner tests assert that the boundary is entered once and every output receives its permission; aggregate gate evidence is retained in Beads.
