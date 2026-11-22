# Survival Iron Man suit on Bedrock

The workshop skin hook applies to the mannequin. The Survival companion is a
villager so it stays friendly and is excluded from monster sleep checks. The
pinned Spigot Geyser starts its entity and pack registries after plugins
enable. Subscribe during plugin enable, and record the companion UUID in
Paper's pre-spawn callback before Geyser sees its spawn packet.

The first jar build found the skin but missed the pack because jar's `-C`
applies to one argument. Give each build-directory file its own `-C` and
verify the embedded pack, its texture bytes and its geometry after building.
Fresh server logs should show both model and pack registration before LAN
discovery. A Switch login and summon are still needed to verify client-side
appearance.
