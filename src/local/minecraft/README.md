# Minecraft on Lorandil

A small Java survival server with Paper, Geyser (Bedrock bridge), and Floodgate
(authenticated Bedrock accounts without a Java purchase). Worlds, inventories,
keys, jars, allowlists, and logs stay outside Git.

## Requirements

Use rootless Podman, Bash, curl, Python 3, Git, sha256sum, and tar. Java runs in a
pinned ARM64-compatible container. Lorandil is a 4 GiB ARM64 Debian host. Its
rootless runtime lacks cgroup delegation and the pasta network helper, so this
launcher uses host networking and an explicit private IPv4 game-server bind.
The heap cap is 1200 MiB; it does not limit all native memory.

Internet access is required for downloads and Microsoft authentication. No router
forwarding, external signaling registration, DNS changes, or public tunnel is
configured. Keep the host on the trusted home network and do not forward game or
discovery ports from the Internet.

## Initial setup

Read the [Minecraft EULA](https://aka.ms/MinecraftEULA), then run from the repo root:

```bash
MINECRAFT_ACCEPT_EULA=true MINECRAFT_LAN_IP=192.168.178.148 \
  bash src/local/minecraft/minecraft.sh setup
bash src/local/minecraft/minecraft.sh start
bash src/local/minecraft/minecraft.sh logs
```

Wait for Paper's `Done` line. Detach from logs with Ctrl-C. This first boot also
fetches Paper's libraries. The wired private IPv4 observed on 2026-11-15 was
`192.168.178.148`; use the host's current address and reserve it with DHCP if
needed. Setup rejects public IPv4 addresses and refuses to overwrite existing
configuration. Do not delete a world to reset installation.

State defaults to `~/.local/share/dadeto/minecraft/`. Set `MINECRAFT_DATA_DIR`
consistently to override it. The container name is `dadeto-minecraft`, so use one
instance per user. Existing containers retain their original mounts and runtime
options; stop and remove only the container before changing those options.

`versions.env` pins Paper 26.3/252, stock Geyser 2.12.1/1302, Floodgate 2.2.5/141,
and Java image digests. Official jar hashes are verified at setup/start. Console
updates may require a corresponding Geyser update; upgrade after a backup.

## Direct Switch 2 LAN discovery candidate

Stock Geyser at the pinned build does not start NetherNet LAN discovery on UDP 7551. In this experiment, MCCompanion advertised a LAN world but joining failed
with Terracotta / InitialConnection-149 at `transferServer`, before any Geyser
login. Its inspected source routes offers through an external relay.

The direct route uses the **unmerged** upstream
[LAN discovery candidate PR 6896](https://github.com/GeyserMC/Geyser/pull/6896),
pinned at `ded737e36f19942fee9126406e40f7e4a19fde99`. It retains signed Microsoft
login validation. For LAN offers without transport identity, it additionally
requires LAN signaling and the nonce from signed client data. That server-lifetime
nonce is not a cryptographic transport binding or protection against a live relay.
Keep this opt-in candidate on the trusted LAN.

Stop the idle server before compiling on this small host:

```bash
bash src/local/minecraft/minecraft.sh stop
bash src/local/minecraft/minecraft.sh backup
bash src/local/minecraft/build-lan-geyser.sh
```

The first build can take about ten minutes. It fetches pinned source/submodules,
runs LAN/authentication/answer-signaling tests, packages the plugin, and verifies
English locale and mapping resources. A successful compile without those resources
can produce a jar that immediately disables itself. Build output defaults to
`~/.local/share/dadeto/minecraft-builds/geyser-lan/`; override with
`MINECRAFT_BUILD_DIR`. The builder writes a checksum/source record beside the jar.
Dependency downloads still follow the upstream build; source pinning does not
claim byte-identical rebuilds.

Install while stopped, preserving the stock jar outside the plugin scan directory:

```bash
MC_DATA=${MINECRAFT_DATA_DIR:-${XDG_DATA_HOME:-$HOME/.local/share}/dadeto/minecraft}
MC_BUILD=${MINECRAFT_BUILD_DIR:-${XDG_DATA_HOME:-$HOME/.local/share}/dadeto/minecraft-builds/geyser-lan}
mkdir -p "$MC_DATA/plugin-backups"
cp -n "$MC_DATA/plugins/Geyser-Spigot.jar" "$MC_DATA/plugin-backups/Geyser-Spigot-stock.jar"
cp "$MC_BUILD/bootstrap/spigot/build/libs/Geyser-Spigot.jar" "$MC_DATA/plugins/Geyser-Spigot.jar"
cp "$MC_BUILD/bootstrap/spigot/build/libs/geyser-lan-build.json" "$MC_DATA/geyser-lan-build.json"
sed 's/@LAN_IP@/192.168.178.148/g' src/local/minecraft/geyser-lan.yml \
  > "$MC_DATA/plugins/Geyser-Spigot/config.yml"
bash src/local/minecraft/minecraft.sh start
```

This replaces Geyser configuration with the supplied LAN template; the stopped
backup retains the prior configuration. Adjust the address in the substitution
for another host. Start verifies the candidate jar against its local build record
and recognized source commit. This record documents a locally built artifact; it
is not a publisher signature.

Paper uses private-address TCP 25565. Built-in NetherNet signaling uses TCP 19132
and gameplay uses UDP 19132. The candidate adds UDP 7551 discovery and private-
address UDP 19134 for LAN gameplay. Discovery needs a wildcard listener to receive
broadcasts; the game ports bind the configured private address. Public STUN is
disabled. Some WebRTC sockets open only when a connection is attempted.

With MCCompanion stopped and the console on the same home network, wait 10–15
seconds under Play → Worlds and select **Dadeto LAN**. Avoid guest/client-isolated
Wi-Fi. The observed Switch 2 client is Minecraft 1.26.62. The direct discovery
candidate reached authenticated Java admission; successful world entry and
persistence must still be verified separately.

## Allowlisting and profile lookup

```bash
bash src/local/minecraft/minecraft.sh console
```

Enter `fwhitelist add <gamertag>` (quote spaces). Use Floodgate's command, which
resolves the Bedrock identity, rather than Java account lookup. Confirm success.
Detach from the console with Ctrl-P, Ctrl-Q. Never grant operator status to join.

If Floodgate reports an XUID cache miss, use the locally observed admission UUID:

```bash
MC_DATA=${MINECRAFT_DATA_DIR:-${XDG_DATA_HOME:-$HOME/.local/share}/dadeto/minecraft}
bash src/local/minecraft/build-identity-probe.sh
bash src/local/minecraft/minecraft.sh stop
cp src/local/minecraft/identity-probe/identity-probe.jar "$MC_DATA/plugins/DadetoIdentityProbe.jar"
bash src/local/minecraft/minecraft.sh start
```

Have the player attempt to join once. `logs/latest.log` records
`[DadetoIdentityProbe] Profile <name> UUID <uuid> result ALLOWED`.
Use the profile UUID associated with the expected Floodgate-prefixed name:
`fwhitelist add <uuid>`. Keep the allowlist enabled throughout. The probe logs
profile identifiers and does not modify access decisions; its prelogin result
alone is not proof of successful admission. After allowlisting, remove the probe
jar from the data directory while stopped if it is no longer needed. The builder uses the installed
Paper API libraries and performs compilation without container network access.

## Persistence acceptance and operations

After joining, move, break/place a block, and retain an item. Save and quit,
stop/start the server, then rejoin and confirm block and inventory persistence.
Retain the user's confirmation plus server join/leave logs in the owning bead.
Startup, status responses, and discovery alone do not prove this acceptance gate.

```bash
bash src/local/minecraft/minecraft.sh status
bash src/local/minecraft/minecraft.sh stop
bash src/local/minecraft/minecraft.sh backup
bash src/local/minecraft/minecraft.sh start
```

Backups require a stopped server and include private keys. They are stored beside
the data directory in `minecraft-backups/`. To restore, stop, back up current
state, extract a chosen archive into a separate empty directory, and recreate the
container with that data mount. Avoid mixing worlds from different server versions.

To roll back the candidate, stop and back up, restore the stock jar and pre-LAN
Geyser configuration from `plugin-backups/` or the full backup, remove only
`geyser-lan-build.json`, and start again. Direct console discovery will be absent.

Starting settings are four players, view distance 5, simulation distance 4, two
active processors, and a 2000-block world-size limit. These are initial settings,
not measured performance guarantees. No automatic startup is installed. Stop
allows 120 seconds for saving; avoid forced termination.

## Sources

- [Paper requirements](https://docs.papermc.io/paper/getting-started/)
- [Geyser setup](https://geysermc.org/wiki/geyser/setup/)
- [LAN discovery issue 6853](https://github.com/GeyserMC/Geyser/issues/6853)
- [Floodgate allowlisting](https://geysermc.org/wiki/floodgate/features/)
