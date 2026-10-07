# AllowEffects for detached process launches

- Unexpected hurdle: the shared process launcher serves both Notion Codex and Symphony, and Symphony's default launch path constructed the core launcher without filesystem/process adapters.
- Diagnosis: traced launch creation from each local entry point through the shared launcher to log-directory creation, log-file opens, and process spawn.
- Fix: bind one permission around each launch, pass it directly to all three injected effect adapters, and provide the adapters from both local entry points. Keep log handle cleanup and exit callbacks unchanged.
- Next: apply the same permission boundary to Symphony status-store persistence.
- Verification: focused process, Notion, and Symphony launcher suites assert the token reaches mkdir/open/spawn; aggregate gate evidence is recorded in Beads.
