package net.mattheard.tabletop;

import java.io.*;
import java.nio.file.*;
import java.util.*;
import org.bukkit.*;
import org.bukkit.configuration.file.YamlConfiguration;
import org.bukkit.entity.Player;
import org.bukkit.inventory.ItemStack;

/** Durable return snapshot, written before changing any player inventory or mode. */
public final class ViewerState {
  public final YamlConfiguration original;
  public Location camera;
  public int view;
  public ViewerState(YamlConfiguration original) { this.original = original; }

  public static ViewerState capture(Player player) {
    YamlConfiguration yaml = new YamlConfiguration();
    yaml.set("return", player.getLocation());
    yaml.set("mode", player.getGameMode().name());
    yaml.set("allow-flight", player.getAllowFlight());
    yaml.set("flying", player.isFlying());
    yaml.set("gravity", player.hasGravity());
    yaml.set("held-slot", player.getInventory().getHeldItemSlot());
    List<ItemStack> items = new ArrayList<>();
    for (ItemStack item : player.getInventory().getContents()) items.add(item == null ? null : item.clone());
    yaml.set("inventory", items);
    return new ViewerState(yaml);
  }

  public static ViewerState load(File file) throws IOException {
    YamlConfiguration yaml = new YamlConfiguration();
    try { yaml.load(file); } catch (Exception e) { throw new IOException("Cannot read return snapshot", e); }
    if (yaml.getLocation("return") == null || yaml.getList("inventory") == null
        || yaml.getString("mode") == null) throw new IOException("Incomplete return snapshot; preserved for recovery");
    ViewerState result = new ViewerState(yaml);
    result.view = Math.max(0, Math.min(7, yaml.getInt("view")));
    return result;
  }

  public void save(File file) throws IOException {
    original.set("view", view);
    Files.createDirectories(file.toPath().getParent());
    Path temporary = file.toPath().resolveSibling(file.getName() + ".tmp");
    original.save(temporary.toFile());
    try { Files.move(temporary, file.toPath(), StandardCopyOption.ATOMIC_MOVE, StandardCopyOption.REPLACE_EXISTING); }
    catch (AtomicMoveNotSupportedException e) { Files.move(temporary, file.toPath(), StandardCopyOption.REPLACE_EXISTING); }
  }

  public void restore(Player player) throws IOException {
    Location back = original.getLocation("return");
    if (back == null || back.getWorld() == null) throw new IOException("Return world is unavailable; snapshot retained");
    List<?> values = original.getList("inventory");
    if (values == null || values.size() != player.getInventory().getContents().length)
      throw new IOException("Inventory shape changed; snapshot retained");
    ItemStack[] items = new ItemStack[values.size()];
    for (int i = 0; i < items.length; i++) {
      Object item = values.get(i);
      if (item != null && !(item instanceof ItemStack)) throw new IOException("Invalid inventory snapshot");
      items[i] = item == null ? null : ((ItemStack) item).clone();
    }
    player.setGameMode(GameMode.valueOf(original.getString("mode")));
    player.setAllowFlight(original.getBoolean("allow-flight"));
    player.setFlying(original.getBoolean("allow-flight") && original.getBoolean("flying"));
    player.setGravity(original.getBoolean("gravity", true));
    player.getInventory().setContents(items);
    player.getInventory().setHeldItemSlot(original.getInt("held-slot"));
    if (!player.teleport(back)) throw new IOException("Return teleport refused; snapshot retained");
    player.saveData();
  }
}
