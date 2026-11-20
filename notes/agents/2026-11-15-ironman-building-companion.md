# Iron Man building companion and LAN combat correction

Task owners: dadeto-yar4 (companion), dadeto-6d8v (Bedrock combat).

The owner wants Iron Man to assist building within about 16 blocks, using an
automatic GPT-6-Luna/low controller with ChatGPT subscription authentication.
Do not substitute a model silently or create a visible separate agent task.

The installed global Codex 0.139 rejected this model through ChatGPT. A separately
installed, official checksum-verified Codex 0.169.0 accepted gpt-6-luna with effort
low. The bounded schema probe returned a 3x3 oak wall; evidence is in private
reports/ironman/controller-probe-result.json and controller-probe/last-model-events.jsonl.
Disable the new runtime's code_mode_host for this no-tools controller, since the
single binary does not include its sibling host. Preserve existing desktop CLI.

Paper's native mannequin and Geyser's SessionSkinApplyEvent avoid a Citizens
runtime dependency. The API cleanup method is unregisterAll, verified against the
pinned source after a compile failure. A valid profile texture property bootstraps
Geyser skin application; this plugin injects bundled RGBA pixels for the mannequin
only. Java clients retain the fallback skin. Follow guards and construction rules
are deterministic on the server, independent of model latency. Canonicalize Bukkit
block states before saving ownership so default stair/slab properties do not break
later revisions/undo. Pending writes precede edits; recovery restores before-state.

Combat diagnosis: the pinned Geyser LAN fork declares ATTACK_MOBS/ATTACK_PLAYERS
as supported but omitted them from base abilityValues. Actual UpdateAbilitiesPacket
regression test reproduced Survival false before the patch and passed after adding
both flags; spectator still masks them. Gradle build/tests passed, deployed jar
SHA256 a9b15c603205f8296e927cd147b2474816570d0e09be1eb6507c3e4d5241865b.
Patch source and regression test are tracked in geyser-combat.patch. Java server
permissions/PvP remain authoritative. User ZR confirmation led this investigation;
no user confirmation of restored combat has been received yet.

Display labels changed to lorandil / dadeto's world using Geyser MOTD fields;
world folder identity remains stable. Backups were taken before the no-player
updates. Existing Theseus/coordination user progress must not be reset to rerun
old acceptance scripts. Server console writes reuse npc_guides.Console; piping EOF
into podman attach would close server stdin and must not be used.

Acceptance commands: build-ironman.sh (native compile and parser boundary check),
Python unittest discovery (model/auth/tool restrictions, stale context, payload
bounds, unsolicited construction), console ironman selftest (real world preview,
build, protection, undo, journal recovery), npm run check, exact-head Full Check.
Client skin appearance, physical following and combat still need live Switch
confirmation; server-side proof must not be described as those client checks.

The first native follower harness correctly got no mannequin because an offline
fixture does not load player chunks. The harness now explicitly loads its own
test chunk without a persistent force-load ticket; production following keeps
refusing unloaded terrain. Do not infer a follower regression from that missing
fixture precondition. Construction integration passed on the real server with
the test area restored, and the offline controller is active/paused as intended.
