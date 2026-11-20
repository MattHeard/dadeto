package net.mattheard.tabletop;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;
import org.bukkit.Bukkit;
import org.bukkit.World;
import org.bukkit.Location;
import org.bukkit.block.data.BlockData;

/** Bounded, prevalidated block placements compiled from the supplied ground-floor map. */
public final class HousePlan {
  public record Placement(int x, int y, int z, BlockData data) {}
  public record View(String name, double x, double y, double z) {
    public Location location(World world) { return new Location(world, x, y, z, 0, 90); }
  }
  public final List<Placement> placements = new ArrayList<>();
  public final List<View> views = new ArrayList<>();
  public final String hash;

  public HousePlan(InputStream blocks, InputStream cameras) throws Exception {
    Objects.requireNonNull(blocks, "Missing house plan");
    Objects.requireNonNull(cameras, "Missing camera plan");
    byte[] bytes = blocks.readAllBytes();
    hash = HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));
    Map<String, BlockData> palette = new HashMap<>();
    Set<String> positions = new HashSet<>();
    for (String row : new String(bytes, StandardCharsets.UTF_8).split("\\R")) {
      if (row.isBlank() || row.startsWith("#")) continue;
      String[] fields = row.split("\\t", -1);
      if (fields.length != 4) throw new IllegalArgumentException("Invalid placement row");
      int x = Integer.parseInt(fields[0]), y = Integer.parseInt(fields[1]), z = Integer.parseInt(fields[2]);
      if (x < -12 || x > 56 || y < 63 || y > 70 || z < -4 || z > 56)
        throw new IllegalArgumentException("Placement outside the owned board");
      if (!positions.add(x + "," + y + "," + z)) throw new IllegalArgumentException("Duplicate placement");
      placements.add(new Placement(x, y, z, palette.computeIfAbsent(fields[3], Bukkit::createBlockData)));
    }
    if (placements.isEmpty() || placements.size() > 40000) throw new IllegalArgumentException("Invalid plan size");
    for (String row : new String(cameras.readAllBytes(), StandardCharsets.UTF_8).split("\\R")) {
      if (row.isBlank()) continue;
      String[] f = row.split("\\t", -1);
      if (f.length != 4) throw new IllegalArgumentException("Invalid camera row");
      double x = Double.parseDouble(f[1]), y = Double.parseDouble(f[2]), z = Double.parseDouble(f[3]);
      if (!Double.isFinite(x) || !Double.isFinite(y) || !Double.isFinite(z)
          || x < -12 || x > 56 || z < -4 || z > 56 || y < 80 || y > 150)
        throw new IllegalArgumentException("Camera outside the owned board");
      views.add(new View(f[0], x, y, z));
    }
    if (views.size() != 8) throw new IllegalArgumentException("Expected eight controller camera presets");
  }

  public int mismatchCount(World world) {
    int mismatches = 0;
    for (Placement p : placements)
      if (!p.data().matches(world.getBlockAt(p.x(), p.y(), p.z()).getBlockData())) mismatches++;
    return mismatches;
  }
}
