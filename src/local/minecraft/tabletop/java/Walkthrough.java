package net.mattheard.tabletop;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.*;
import org.bukkit.*;
import org.bukkit.block.data.BlockData;
import org.bukkit.scheduler.BukkitRunnable;

final class Walkthrough {
  private final List<HousePlan.Placement> blocks = new ArrayList<>();
  private final World world;
  private final TabletopPlugin plugin;
  boolean ready;
  Household household;
  Walkthrough(TabletopPlugin plugin, World world) throws IOException {
    this.plugin = plugin;
    this.world = world;
    try (var input = Objects.requireNonNull(plugin.getResource("walkthrough.tsv"))) {
      Map<String, BlockData> palette = new HashMap<>();
      for (String line : new String(input.readAllBytes(), StandardCharsets.UTF_8).split("\n")) {
        String[] row = line.split("\t");
        int x = Integer.parseInt(row[0]), y = Integer.parseInt(row[1]), z = Integer.parseInt(row[2]);
        if (x < -12 || x > 56 || y < 63 || y > 70 || z < 57 || z > 128) throw new IOException("Walkthrough outside reserved footprint");
        blocks.add(new HousePlan.Placement(x, y, z, palette.computeIfAbsent(row[3], Bukkit::createBlockData)));
      }
    }
  }

  Location entrance() { return new Location(world, -7.5, 65, 95.5, -90, 0); }

  void start() {
    Path marker = plugin.getDataFolder().toPath().resolve("walkthrough-v1.ready");
    if (Files.exists(marker)) { finish(); return; }
    new BukkitRunnable() {
      int next;
      @Override public void run() {
        try {
          for (int end = Math.min(next + 256, blocks.size()); next < end; next++) {
            var placement = blocks.get(next);
            var block = world.getBlockAt(placement.x(), placement.y(), placement.z());
            if (block.getType().isAir()) block.setBlockData(placement.data(), false);
            else if (!placement.data().matches(block.getBlockData())) throw new IOException("Occupied walk-through footprint at " + block.getLocation());
          }
          if (next == blocks.size()) {
            world.save();
            Files.writeString(marker, "v1\n");
            finish();
            plugin.getLogger().info("Walk-through Noble's House ready: " + next + " blocks");
            cancel();
          }
        } catch (Exception error) {
          plugin.getLogger().log(java.util.logging.Level.SEVERE, "Walk-through placement stopped", error);
          cancel();
        }
      }
    }.runTaskTimer(plugin, 1, 1);
  }

  private void finish() {
    ready = true;
    if (Bukkit.getPluginManager().isPluginEnabled("Geyser-Spigot")) {
      household = new Household();
      household.spawn(plugin, world);
    }
  }

  void close() { if (household != null) household.close(); }
  int residents() { return household == null ? 0 : household.count(); }

  long mismatches() {
    return blocks.stream().filter(p -> !p.data().matches(world.getBlockAt(p.x(), p.y(), p.z()).getBlockData())).count();
  }
}
