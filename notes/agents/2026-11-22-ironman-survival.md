# Iron Man as a Survival mob

The workshop implementation uses an invulnerable mannequin and direct block
writes. Reusing its world allowlist would enable workshop behavior in Survival.
The first Survival slice uses a separate native husk with red and gold armor,
damage, provisions, pathfinding and bounded owner-directed suit actions.
Keep the feature off by default in source and enable it on Lorandil. Verify
the server startup marker and preserve existing plugin configuration.
The follow-up is player-like material inventory, gathering and building.
