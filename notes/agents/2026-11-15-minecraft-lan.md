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

## Direct LAN result

The helper route failed before login: Switch 2 Minecraft 1.26.62 reported
InitialConnection-149 and WorldName transferServer. MCCompanion's inspected source
forwards offers through its external relay. Stock Geyser did not instantiate
NetherNetDiscoverySignaling, matching upstream issue 6853.

Built unmerged upstream PR 6896 at ded737e36f19942fee9126406e40f7e4a19fde99.
The first package lacked language/mapping submodules and disabled itself at boot.
The corrected build initializes both pinned submodules and verifies the English
locale plus block/item mappings inside the jar. Twelve selected LAN, signed-login,
bind-retry, configuration, and answer-signaling tests passed. The pinned builder
repeated successfully from warm cache; see reports/geyser-lan-builder-smoke.log.
Candidate SHA256: e585d6b94cdee87305a6bf1bf94803b1c1e8ab5f127c08c6746126a3e88022c5.
The runtime record and jar live outside Git; start verifies its recognized source
commit and locally recorded binary hash. It is not an official publisher signature.

The candidate starts native discovery on UDP 7551 and uses private-address UDP
19134 for LAN gameplay. Discovery binds wildcard to receive LAN broadcasts;
Paper/gameplay retain the private IPv4 bind, and public STUN/NXS remain disabled.
The LAN compatibility policy still verifies Microsoft's signed login chain and
requires LAN source plus a matching signed nonce. This server-lifetime nonce is
not cryptographic transport binding and cannot prevent live relay/replay.

The user confirmed Dadeto LAN appeared with MCCompanion stopped. A direct attempt
reached authenticated Java admission, then failed allowlisting because the external
username/XUID cache remained empty. The local IdentityProbe recorded the expected
Floodgate-prefixed profile UUID; fwhitelist add UUID succeeded and whitelist.json
persisted it. At 11:11:59Z latest.log records the player joined the game and logged
in at overworld coordinates. The user confirmed being in the world on Switch 2.

The first trace also listened to PlayerLoginEvent; Paper warns that this disables
reconfiguration APIs. The retained source uses only AsyncPlayerPreLoginEvent,
which supplied the same transformed profile UUID. Remove the runtime probe after
allowlisting; it was moved outside plugins during the persistence-test restart.
The probe never changes admission results, authentication, or allowlist policy.

Quality evidence: the initial pushed head passed authoritative check-full at
https://github.com/MattHeard/dadeto/actions/runs/43705690503/job/132786145486.
A rebased all-unit fallback had one unchanged-test timeout under concurrent Gradle
compilation; dadeto-ty0l owns that follow-up. Its original-timeout targeted retry
passed 10/10. A clean aggregate rerun exited 0 (reports/minecraft-check-final.log
and .exit); all static gates passed, with no changed tests selected. Report test
and static phases separately: the aggregate can print a passing static summary
following a failed test phase, while correctly returning exit 1 overall.

Build commands and installation/rollback are in src/local/minecraft/README.md.
The final local and full-CI results must be recorded for the final pushed head;
prior CI does not cover later builder/probe changes. World persistence acceptance
is being checked after a clean stop, consistent backup, and restart.

## Final acceptance

After the clean server restart, Switch 2 returned InitialConnection-146 with no
new server login event. Fully closing Minecraft from HOME/X/Close, reopening, and
selecting Dadeto LAN restored the connection. This supports a stale client LAN
session hypothesis but does not prove the internal cause. Document the observed
client refresh as the restart workaround. The user confirmed the placed block
survived. They did not perform an inventory test; do not claim one. The saved
player file also matched the stopped-world backup byte-for-byte. Paper26.3 uses
world/players/data rather than the old world/playerdata directory.

The final runtime-code head01efa0b3fb passed npm run check (explicit exit0) and
authoritative check-full: https://github.com/MattHeard/dadeto/actions/runs/43707981432.
The runtime probe is removed, only Geyser/Floodgate are loaded, and the user account
remains allowlisted by the locally observed UUID. No phone helper, external relay,
router forwarding, or console DNS change is needed. This final documentation
records the client-refresh workaround and the precise acceptance scope.
