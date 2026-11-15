# Intuition Engine: local guide avatars and real user evidence

Task `dadeto-y15j`. The user asked to continue while testing and then left the
server. No input/approval was required for autonomous development. Canonical spec
remains Partial / Active; unrestricted NPC dialogue and deeper planning are not
claimed.

## Actual player observations

Server logs show the user's real Bedrock session entered `/intuition`, moved and
aimed at modeled components, and executed eight `use-*` replacement transactions.
The player disconnected after four, rejoined with progress preserved, and then
completed the remaining four. The reason for that disconnect is unknown; do not
claim a completely uninterrupted run or infer a crash/user intent.

At revision63 all eight were replaced and128 original-material blocks existed
on Ship B. A contrasting representation was generated at revision64 while that
same resumed session stayed connected (15:43:19→15:47:13 UTC). The user then
made two real coordination choices: A=1/B=2, rewards0/3, ending at revision66.
All of this is server-observed device interaction, not a claim about subjective
understanding, guide text readability, NPC rendering or safe return to survival.
No `/intuition ask` or `/intuition leave` was observed. Preserve this progress;
do not rerun reset fixtures now.

## NPC implementation and evidence

Added a private Pi-local routine projection over existing semantic guides.
`npc_guides.py deploy` added two role/goal/disposition/relationship objects in a
zero-block atomic scene transaction, revision66→67. The worker projects them into
ordinary named, invulnerable, NoAI villagers with owned tags. Dialogue knowledge
is linked to the existing gold-marker guide; right-clicking the villager itself
is not a free-form conversation interface. Local pacing/facing is presence-aware;
there is no frontier-model inference or general goal planner.

Commands use a bounded private stdin-pipe adapter tied to the inspected Podman
Java PID. Independent writers leave the container's writer open. The critical
reader-EOF behavior is covered with a real Linux child-pipe test. Input scopes,
coordinates, capacity, route clearance, presence and command-text escaping are
also tested. Unit discovery passed8/8, including existing transport tests.

Observed both villagers' tags, names, Invulnerable/NoAI/PersistenceRequired data,
fixed UUIDs and two distinct route stations through real server entity data.
The user service is enabled with private runtime copies, NoNewPrivileges,
configured10% CPU/128MB caps and already-enabled user lingering. Observed process
RSS about16MB/CPU0.1%; this is a sample, not a latency/resource guarantee.

An offline whole-server backup/restart preserved the **entire** revision67 scene,
including the user's8/8 replacements, original-material provenance, contrast,
coordination A1/B2 and0/3 rewards, guide knowledge and NPC role meanings. The
service retried while Minecraft was unavailable, then reconciled saved villagers.
Read-only `verify_npcs.py` checks fresh active service status, one entity per tag,
UUIDs, scene integrity and zero mismatches across33,672 original house placements.
Artifacts: `reports/intuition/npc-tests.log`, `npc-route-probe.log`,
`npc-restart-verification.log`, `npc-pre-restart-state.json`.

## Hurdles and next-time guidance

The first generated systemd unit quoted `WorkingDirectory=` as though it were an
ExecStart argument; systemd treated the quote as part of a non-absolute path.
Removed the unnecessary directive and added `systemd-analyze --user verify`
before enabling. The service then started with the intended settings.

An immediate `is-active` check after the game restart briefly returned
`activating` during the configured5-second retry. Tightened the evaluator to wait
for both active status and fresh worker output. The implementation recovered as
designed; do not mistake the normal backoff for a persistent failure.

Only tagged entities are reconciled. Current routes use two lab force-load
chunks; stopping the worker intentionally preserves passive NPCs/tickets. Inspect
ownership before explicit cleanup. Registry/runtime are covered by whole-data
backups; regenerate the separate user unit with the installer. Updating source
requires rerunning the installer to refresh private runtime copies.

The console count response was `Test passed. Count: 1`, rather than the initially
guessed comma/lowercase form. The read-only verifier initially timed out despite
correct entities; matched the observed response and added a direct parser fixture
test before rerunning. No world/entity fix was needed.

Required local/full CI and publication evidence are recorded in the task/PR once
terminal. Do not copy an earlier commit's successful workflow onto this change.
