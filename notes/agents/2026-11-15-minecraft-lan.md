# Minecraft LAN experiment on Lorandil

Owning bead: dadeto-6gtn. Code is isolated from unrelated dirty shared-checkout files.

Lorandil is ARM64 Debian 13 with 4 GiB RAM, Podman 5.4.2, and no native Java or
Docker. Rootless startup with memory limits failed writing memory.max; removing
those limits exposed a missing pasta networking helper. Host networking with
explicit private-address binds booted Paper and both plugins. The launcher retains
a Java heap cap but does not claim a total-process memory limit.

The generated Geyser configuration was the decisive source: this build uses
NetherNet with TCP signaling plus UDP gameplay, and defaults java.auth-type to
online even when Floodgate is installed. Set floodgate explicitly. Disable STUN
and advertise only the LAN IPv4 address for this experiment. Old UDP-only/RakNet
recipes do not describe this build. Read the generated config before changing
network or authentication settings.

See src/local/minecraft/README.md for operation and the manual Switch acceptance
procedure. Keep the owning bead open until the real console join and world-state
persistence are confirmed. Startup, socket, and status evidence cannot substitute
for that test. Beads operations use the original checkout's established database;
no database directory was copied into the isolated checkout.

Floodgate username allowlisting for VocableRecord50 failed with an upstream XUID
cache miss. Do not claim the user is allowlisted from command submission alone.
Use the authenticated player UUID after a join attempt, or retry the username
lookup when its upstream cache is populated. Keep allowlisting enabled.

Tool runtime reset invalidated the original process handles and temporary check
logs. Recovered the server from its named Podman container; restarted quality
gates into reports/minecraft-check.log and reports/minecraft-lint.log.

The user screenshot shows Worlds, Realms, Servers, and a Social control at the
top right, rather than a Friends tab. Guide from the observed UI, not an older
menu recipe. The user has an Android phone for the documented LAN-helper route.

Verified acceptance so far: all three official SHA-256 hashes match; Bash syntax
check passes; setup rejects a public address before creating the data directory;
Java status protocol returns Dadeto LAN, Paper 26.3/protocol 777, 0/4 players;
NetherNet TCP and UDP listeners bind the wired private address. A stopped-world
backup and clean restart succeeded. These are service checks, not console-join
evidence. Required repository gates are recorded separately in the owning bead.

Repository validation: npm run check passed all 11 gates (terminal check-summary,
zero failures); npm run lint exited 0. Bash syntax, public-address rejection,
fresh setup using verified local jars, Prettier checks, and agents:reuse-report
also passed. Logs: reports/minecraft-check.log, reports/minecraft-lint.log,
reports/minecraft-setup-smoke.log, reports/minecraft-reuse-report.log.

The Android MCCompanion broadcast appeared directly at the top of Worlds as
MCCompanion: 192.168.178.148, marked LAN world. Selecting it produced Terracotta,
with no Geyser login event in latest.log. Discovery is proven; gameplay is not.
Inspect the detailed console error and helper transport before changing auth.
