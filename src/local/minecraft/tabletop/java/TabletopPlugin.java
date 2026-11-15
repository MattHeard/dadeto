package net.mattheard.tabletop;

import java.io.*;
import java.nio.file.*;
import java.util.*;
import java.util.logging.Level;
import net.kyori.adventure.text.Component;
import net.kyori.adventure.text.format.NamedTextColor;
import org.bukkit.*;
import org.bukkit.command.*;
import org.bukkit.entity.Player;
import org.bukkit.event.*;
import org.bukkit.event.block.*;
import org.bukkit.event.entity.EntityDamageEvent;
import org.bukkit.event.inventory.*;
import org.bukkit.event.player.*;
import org.bukkit.inventory.*;
import org.bukkit.inventory.meta.ItemMeta;
import org.bukkit.plugin.java.JavaPlugin;
import org.bukkit.scheduler.BukkitRunnable;

/** Read-only, roofless house display with eight controller-selectable overhead cameras. */
public final class TabletopPlugin extends JavaPlugin implements Listener, CommandExecutor {
  private static final String WORLD = "dadeto_tabletop";
  private final Map<UUID, ViewerState> viewers = new HashMap<>();
  private HousePlan plan;
  private SceneEngine scenes;
  private World world;
  private boolean ready;
  private int built;

  @Override public void onEnable() {
    saveDefaultConfig();
    scenes = new SceneEngine(this);
    try { plan = new HousePlan(getResource("house.tsv"), getResource("views.tsv")); }
    catch (Exception e) { getLogger().log(Level.SEVERE, "Invalid tabletop plan; nothing changed", e); getServer().getPluginManager().disablePlugin(this); return; }
    Objects.requireNonNull(getCommand("tabletop")).setExecutor(this);
    getServer().getPluginManager().registerEvents(this, this);
    getServer().getScheduler().runTask(this, this::prepareWorld);
  }

  private void prepareWorld() {
    try {
      File container = getServer().getWorldContainer();
      requireOwnedFolder(new File(container, WORLD));
      File[] saves = container.listFiles(File::isDirectory);
      if (saves != null) for (File save : saves)
        requireOwnedFolder(new File(save, "dimensions/minecraft/" + WORLD));
      for (World loaded : Bukkit.getWorlds())
        if (loaded.getKey().equals(NamespacedKey.minecraft(WORLD))) requireOwnedFolder(loaded.getWorldFolder());
      world = new WorldCreator(WORLD).environment(World.Environment.NORMAL)
          .generator(new EmptyWorld()).generateStructures(false).createWorld();
      if (world == null) throw new IOException("World creation returned no world");
      File marker = new File(world.getWorldFolder(), "dadeto-tabletop.marker");
      boolean previouslyOwned = marker.isFile();
      Files.writeString(marker.toPath(), "Dadeto noble house tabletop\n");
      world.setGameRule(GameRules.ADVANCE_TIME, false);
      world.setGameRule(GameRules.ADVANCE_WEATHER, false);
      world.setGameRule(GameRules.SPAWN_MOBS, false);
      world.setGameRule(GameRules.KEEP_INVENTORY, true);
      world.setTime(6000); world.setStorm(false); world.setThundering(false);
      world.setDifficulty(Difficulty.PEACEFUL); world.setPVP(false);
      world.setSpawnLocation(22, 65, 24);
      world.getWorldBorder().setCenter(72, 26); world.getWorldBorder().setSize(200);
      scenes.start(world);
      Path version = new File(getDataFolder(), "built.sha256").toPath();
      if (previouslyOwned && Files.exists(version) && Files.readString(version).trim().equals(plan.hash)) {
        built = plan.placements.size(); ready = true;
        getLogger().info("Tabletop ready: saved house, " + built + " placements; 2x2 blocks per 5ft square");
      } else build();
    } catch (Exception e) { getLogger().log(Level.SEVERE, "Tabletop world not ready", e); }
  }

  static void requireOwnedFolder(File directory) throws IOException {
    if (!directory.exists()) return;
    File marker = new File(directory, "dadeto-tabletop.marker");
    if (!marker.isFile() || !Files.readString(marker.toPath()).equals("Dadeto noble house tabletop\n"))
      throw new IOException("Existing unowned tabletop world; refusing to edit: " + directory);
  }

  private void build() {
    try { Files.deleteIfExists(new File(getDataFolder(), "built.sha256").toPath()); }
    catch (IOException e) { getLogger().log(Level.SEVERE, "Cannot invalidate the prior build marker; no blocks changed", e); return; }
    ready = false; built = 0;
    new BukkitRunnable() {
      @Override public void run() {
        try {
          int stop = Math.min(built + 1000, plan.placements.size());
          while (built < stop) {
            HousePlan.Placement p = plan.placements.get(built++);
            world.getBlockAt(p.x(), p.y(), p.z()).setBlockData(p.data(), false);
          }
          if (built == plan.placements.size()) {
            world.save();
            Files.writeString(new File(getDataFolder(), "built.sha256").toPath(), plan.hash + "\n");
            ready = true; cancel();
            getLogger().info("Tabletop ready: Noble's House ground floor; " + built + " placements; 8 bird's-eye cameras; 2x2 blocks per 5ft square");
          }
        } catch (Exception e) { cancel(); ready = false; getLogger().log(Level.SEVERE, "Bounded house build failed", e); }
      }
    }.runTaskTimer(this, 1L, 1L);
  }

  private File snapshot(Player player) { return new File(getDataFolder(), "viewers/" + player.getUniqueId() + ".yml"); }

  private boolean enter(Player player) {
    try { scenes.leave(player); } catch (IOException e) { player.sendMessage("Lab return failed; snapshot retained."); return false; }
    if (!ready) { player.sendMessage("The house is still being prepared. Try again shortly."); return false; }
    try {
      ViewerState state = viewers.get(player.getUniqueId());
      if (state == null) {
        state = snapshot(player).exists() ? ViewerState.load(snapshot(player)) : ViewerState.capture(player);
        state.save(snapshot(player));
        viewers.put(player.getUniqueId(), state);
      }
      player.setGameMode(GameMode.ADVENTURE); player.setAllowFlight(true); player.setFlying(true); player.setGravity(false);
      player.getInventory().clear();
      Material[] icons = {Material.COMPASS, Material.BOOK, Material.OAK_STAIRS, Material.RED_DYE,
          Material.OAK_PLANKS, Material.BROWN_BED, Material.FURNACE, Material.GOLDEN_APPLE};
      for (int i = 0; i < plan.views.size(); i++) player.getInventory().setItem(i, icon(icons[i], plan.views.get(i).name()));
      player.getInventory().setItem(8, icon(Material.BARRIER, "Return to survival"));
      player.getInventory().setHeldItemSlot(state.view);
      show(player, state.view);
      player.sendMessage("Noble's House: select a hotbar item for a bird's-eye view. Last item returns to survival.");
      return true;
    } catch (Exception e) { getLogger().log(Level.SEVERE, "Could not enter tabletop; return snapshot retained", e); player.sendMessage("Tabletop entry failed; your return snapshot has been retained."); return false; }
  }

  private ItemStack icon(Material material, String name) {
    ItemStack item = new ItemStack(material); ItemMeta meta = item.getItemMeta();
    meta.displayName(Component.text(name, NamedTextColor.GOLD)); item.setItemMeta(meta); return item;
  }

  private void show(Player player, int index) throws IOException {
    ViewerState state = viewers.get(player.getUniqueId());
    state.view = index; state.camera = plan.views.get(index).location(world);
    state.save(snapshot(player));
    if (!player.teleport(state.camera)) throw new IOException("Camera teleport refused");
    player.sendActionBar(Component.text(plan.views.get(index).name() + " | 5 ft = 2 x 2 blocks"));
  }

  void leaveTabletop(Player player) throws IOException {
    leave(player);
    if (snapshot(player).exists()) throw new IOException("Tabletop return failed; snapshot retained");
  }

  @Override public void onDisable() { if (scenes != null) scenes.close(); }

  private void leave(Player player) {
    ViewerState state = viewers.remove(player.getUniqueId());
    try {
      if (state == null && snapshot(player).exists()) state = ViewerState.load(snapshot(player));
      if (state == null) return;
      state.restore(player);
      Files.delete(snapshot(player).toPath());
      player.sendMessage("Returned to survival with your saved inventory and position.");
    } catch (Exception e) { getLogger().log(Level.SEVERE, "Return failed; snapshot retained", e); player.sendMessage("Return needs attention; your saved snapshot is retained."); }
  }

  @Override public boolean onCommand(CommandSender sender, Command command, String label, String[] args) {
    if (args.length == 0) { if (sender instanceof Player player) enter(player); else sender.sendMessage("tabletop status | verify | queue <player> | visit <player> | return <player>"); return true; }
    String action = args[0].toLowerCase(Locale.ROOT);
    if (action.equals("leave") && sender instanceof Player player) { leave(player); return true; }
    if (action.equals("view") && sender instanceof Player player) {
      if (viewers.containsKey(player.getUniqueId()) && args.length == 2) {
        try { show(player, Math.max(0, Math.min(7, Integer.parseInt(args[1]) - 1))); }
        catch (Exception e) { sender.sendMessage("Use /tabletop view 1 through 8"); }
      }
      return true;
    }
    if (!sender.hasPermission("dadeto.tabletop.admin")) { sender.sendMessage("That tabletop control belongs to the DM."); return true; }
    switch (action) {
      case "status" -> sender.sendMessage("Tabletop " + (ready ? "ready" : "building") + ": " + built + "/" + plan.placements.size() + " placements; " + viewers.size() + " viewers; scale 2x2 blocks per 5ft; world " + WORLD);
      case "selftest" -> {
        try { sender.sendMessage(ViewerStateCheck.run(new File(getDataFolder(), "selftest"), Bukkit.getWorlds().getFirst())); }
        catch (Exception e) { getLogger().log(Level.SEVERE, "Viewer-state check failed", e); sender.sendMessage("FAIL: " + e.getMessage()); }
      }
      case "verify" -> sender.sendMessage(ready ? "Tabletop verification: " + plan.mismatchCount(world) + " mismatches across " + plan.placements.size() + " placements" : "Build not ready");
      case "rebuild" -> { if (ready) build(); else sender.sendMessage("Build already in progress"); }
      case "queue" -> {
        if (args.length != 2) { sender.sendMessage("tabletop queue <exact player name>"); break; }
        List<String> names = new ArrayList<>(getConfig().getStringList("queued-visits"));
        if (!names.contains(args[1])) names.add(args[1]);
        getConfig().set("queued-visits", names); saveConfig(); sender.sendMessage("Tabletop visit queued for " + args[1]);
      }
      case "visit", "return" -> {
        if (args.length != 2) { sender.sendMessage("tabletop " + action + " <exact player name>"); break; }
        Player player = Bukkit.getPlayerExact(args[1]);
        if (player == null) sender.sendMessage("Player is not online; use queue for the next join");
        else if (action.equals("visit")) { if (enter(player)) sender.sendMessage("Viewing tabletop: " + player.getName()); }
        else { leave(player); sender.sendMessage("Return requested: " + player.getName()); }
      }
      default -> sender.sendMessage("tabletop status | verify | queue | visit | return | rebuild");
    }
    return true;
  }

  @EventHandler public void onJoin(PlayerJoinEvent event) {
    Player player = event.getPlayer();
    List<String> names = new ArrayList<>(getConfig().getStringList("queued-visits"));
    if (snapshot(player).exists() || names.contains(player.getName())) {
      getServer().getScheduler().runTaskLater(this, () -> {
        if (player.isOnline() && enter(player)) {
          List<String> remaining = new ArrayList<>(getConfig().getStringList("queued-visits"));
          remaining.remove(player.getName()); getConfig().set("queued-visits", remaining); saveConfig();
        }
      }, 30L);
    }
  }
  @EventHandler public void onQuit(PlayerQuitEvent event) { viewers.remove(event.getPlayer().getUniqueId()); }
  @EventHandler public void onHeld(PlayerItemHeldEvent event) {
    Player player = event.getPlayer();
    if (!viewers.containsKey(player.getUniqueId())) return;
    if (event.getNewSlot() == 8) { event.setCancelled(true); getServer().getScheduler().runTask(this, () -> leave(player)); }
    else try { show(player, event.getNewSlot()); } catch (IOException e) { getLogger().log(Level.SEVERE, "Camera save failed", e); }
  }
  @EventHandler public void onMove(PlayerMoveEvent event) {
    ViewerState state = viewers.get(event.getPlayer().getUniqueId());
    if (state != null && state.camera != null && !(event instanceof PlayerTeleportEvent)) event.setTo(state.camera.clone());
  }
  @EventHandler public void onBreak(BlockBreakEvent event) { if (event.getBlock().getWorld().equals(world)) event.setCancelled(true); }
  @EventHandler public void onPlace(BlockPlaceEvent event) { if (event.getBlock().getWorld().equals(world)) event.setCancelled(true); }
  @EventHandler public void onDamage(EntityDamageEvent event) { if (viewers.containsKey(event.getEntity().getUniqueId())) event.setCancelled(true); }
  @EventHandler public void onClick(InventoryClickEvent event) { if (viewers.containsKey(event.getWhoClicked().getUniqueId())) event.setCancelled(true); }
  @EventHandler public void onDrag(InventoryDragEvent event) { if (viewers.containsKey(event.getWhoClicked().getUniqueId())) event.setCancelled(true); }
  @EventHandler public void onDrop(PlayerDropItemEvent event) { if (viewers.containsKey(event.getPlayer().getUniqueId())) event.setCancelled(true); }
  @EventHandler public void onSwap(PlayerSwapHandItemsEvent event) { if (viewers.containsKey(event.getPlayer().getUniqueId())) event.setCancelled(true); }
  @EventHandler public void onInteract(PlayerInteractEvent event) { if (viewers.containsKey(event.getPlayer().getUniqueId())) event.setCancelled(true); }
}
