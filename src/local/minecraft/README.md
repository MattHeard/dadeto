# Minecraft on Lorandil

A small LAN-only Java survival server with Paper, Geyser (Bedrock protocol bridge),
and Floodgate (authenticated Bedrock accounts without a Java purchase).
The first milestone is an actual Switch 2 join and persistence check.
Server startup alone does not prove console compatibility.

## Requirements and first setup

Use rootless Podman, Bash, curl, Python 3, sha256sum, and tar. The pinned Java 25
image supports ARM64. This setup uses host networking because Lorandil lacks
Podman's pasta helper and rootless cgroup delegation. Paper and Geyser bind to a
specific RFC1918 IPv4 address; the launcher does not configure the router,
forward ports, register external signaling, or install a public tunnel.
Internet access is still needed for downloads and Microsoft authentication.

Read the [Minecraft EULA](https://aka.ms/MinecraftEULA) before setup:

```bash
MINECRAFT_ACCEPT_EULA=true MINECRAFT_LAN_IP=192.168.178.148 \
  bash src/local/minecraft/minecraft.sh setup
bash src/local/minecraft/minecraft.sh start
bash src/local/minecraft/minecraft.sh logs
```

Use the host's current wired private IPv4 address, and reserve it in the router's
DHCP settings if needed. Lorandil's wired address observed on 2026-11-15 was
`192.168.178.148`. This is a host-specific observation, not a portable default.
Setup preserves existing configuration by refusing to overwrite it. If setup is
interrupted, inspect/remove only the incomplete configuration before retrying;
never delete a world to reset the installation.

State defaults to `~/.local/share/dadeto/minecraft/`. Override with
`MINECRAFT_DATA_DIR` consistently for every command. The world, player inventories,
allowlist, plugin keys, jars, logs, and generated configuration stay outside Git.
The container has a fixed name (`dadeto-minecraft`), so use one instance per user.
Existing containers retain their original mounts/runtime options; stop and remove
only the container before recreating it after changing those options.

`versions.env` pins Paper 26.3 build 252, Geyser 2.12.1 build 1302, Floodgate 2.2.5
build 141, and a Java image digest. Jar checksums come from their official release
APIs and are verified at setup and start. Paper/Geyser download additional runtime
assets on first boot. Upgrade deliberately after a stopped-world backup; console
updates may require a corresponding Geyser update.

## Access and connection test

Paper listens on the selected private address at TCP 25565. Geyser uses TCP and
UDP 19132 (NetherNet signaling and gameplay). Built-in signaling advertises only
the selected private address; public STUN discovery is disabled. Java online mode
and the allowlist stay enabled. Geyser explicitly uses Floodgate authentication.

Add the Bedrock account through the server console:

```bash
bash src/local/minecraft/minecraft.sh console
```

Then enter `fwhitelist add <gamertag>` (quote a gamertag containing spaces).
Use Floodgate's command rather than Java's `whitelist add`, which resolves a
different identity. Confirm success in the console. If the lookup reports that the gamertag is not
cached, attempt the authenticated join, record its Floodgate UUID from the server
log, and use `fwhitelist add <UUID>` instead. Keep the allowlist enabled.
Detach with Ctrl-P, Ctrl-Q;
Ctrl-C may affect the attached process. Never grant operator status just to join.

1. Put Switch 2 and Lorandil on the same home network, without guest/client
   isolation. Sign into the Microsoft account and enable multiplayer access.
2. Note the installed Minecraft edition and version. On the current Play screen,
   use Social (top right) to inspect available games; older layouts use a Friends
   tab. Do not assume automatic console discovery.
3. If absent, use a current LAN-emulation helper such as MCCompanion on another
   device on the same network, targeting `192.168.178.148`, port `19132`.
   Confirm that helper supports the installed client's NetherNet transport.
   No console DNS changes are required for this route. On Android, install
   [MCCompanion](https://play.google.com/store/apps/details?id=net.netherdev.netherLink),
   enter the address and port, and tap Start Broadcasting. Keep the app open,
   wait 10–15 seconds, then look for MCCompanion in the Switch Social/LAN list.
4. Join the advertised LAN game. Built-in HTTP signaling may show a trust prompt;
   accept only the intended private server address. Record any error code and
   server log timestamp if joining fails.
5. Move, break/place a block, and put an item in a chest. Leave, stop/start the
   server, and rejoin. Confirm the block, chest contents, and inventory persist.
6. Retain join/leave log excerpts and the user's console confirmation in the owning
   bead. A Java status or HTTP signaling response proves only that service layer.

Console joining is the manual acceptance gate. Current Geyser documentation lists
LAN emulation, a friends-list broadcaster, and BedrockConnect as console routes.
Switch 2 transport reports make an actual device test essential. Do not switch to
public DNS or expose ports as a speculative fix for a failed LAN join.

## Operations

```bash
bash src/local/minecraft/minecraft.sh status
bash src/local/minecraft/minecraft.sh stop
bash src/local/minecraft/minecraft.sh backup
bash src/local/minecraft/minecraft.sh start
```

Backups require the server to be stopped and contain the complete data directory,
including private plugin keys. Keep them private. They are written alongside the
data directory in `minecraft-backups/`. To restore, stop the server, back up the
current data, extract the chosen archive into a separate empty directory, and
start a newly created container mounted to that directory. Avoid mixing worlds
from different Minecraft versions.

The Java heap is capped at 1200 MiB with two active processors, view distance 5,
simulation distance 4, four players, and a 2000-block world-size limit. These are
starting settings for this 4 GiB host, not measured performance guarantees. Heap
size does not cap all native memory; cgroup limits are disabled. Keep repo quality
runs and chunk exploration separate if the host experiences memory pressure.
No automatic startup is installed for this experiment. `podman stop --time 120`
allows Paper to save cleanly. Avoid forced container termination.

## Sources

- [Paper requirements](https://docs.papermc.io/paper/getting-started/)
- [Geyser setup and NetherNet](https://geysermc.org/wiki/geyser/setup/)
- [Console connection methods](https://geysermc.org/wiki/geyser/using-geyser-with-consoles/)
- [Floodgate allowlisting](https://geysermc.org/wiki/floodgate/features/)
