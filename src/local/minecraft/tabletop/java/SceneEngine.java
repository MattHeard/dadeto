package net.mattheard.tabletop;

import com.google.gson.*;
import java.io.*;
import java.nio.file.*;
import java.util.*;
import java.util.concurrent.*;
import java.util.function.*;
import org.bukkit.*;
import org.bukkit.block.Block;
import org.bukkit.block.data.BlockData;
import org.bukkit.command.*;
import org.bukkit.entity.Player;
import org.bukkit.event.*;
import org.bukkit.event.player.*;

/** Private local request inbox; all Bukkit access stays on the server thread. */
final class SceneEngine implements Listener, CommandExecutor {
  private final TabletopPlugin plugin;
  private final Path root;
  private final ExecutorService disk = Executors.newSingleThreadExecutor(r -> { Thread t = new Thread(r, "dadeto-scene-disk"); t.setDaemon(true); return t; });
  private SceneModel.State state = new SceneModel.State();
  private World world;
  private boolean busy = true, failed, closing, contextPending;
  private String phase = "starting";
  private SceneModel.Journal active;
  private List<String> cells = List.of();
  private final Map<String,BlockData> palette = new HashMap<>();
  private int cursor;
  private boolean rollback;
  private String rollbackReason;
  private String actionMessage;
  private record Armed(String object,int revision,long at) {}
  private final Map<UUID,Armed> armed = new HashMap<>();
  private final Map<UUID,Long> lastUse = new HashMap<>();
  private final Map<UUID,ViewerState> visitors = new HashMap<>();

  SceneEngine(TabletopPlugin plugin) {
    this.plugin = plugin; root = plugin.getDataFolder().toPath().resolve("intuition");
    Objects.requireNonNull(plugin.getCommand("intuition")).setExecutor(this);
    Bukkit.getPluginManager().registerEvents(this, plugin);
  }
  void start(World world) {
    this.world = world;
    try {
      Files.createDirectories(root.resolve("inbox")); Files.createDirectories(root.resolve("results")); Files.createDirectories(root.resolve("history"));
      if (Files.exists(root.resolve("state.json"))) state = read(root.resolve("state.json"), SceneModel.State.class);
      SceneModel.check(state);
      if (Files.exists(root.resolve("pending.json"))) {
        active = read(root.resolve("pending.json"), SceneModel.Journal.class);
        validateJournal(active);
        if (state.lastJob.equals(active.id())) {
          write("results/" + active.id() + ".json", result(active.id(), "completed", "Recovered committed revision " + state.revision, active.newBlocks().size()));
          Files.deleteIfExists(root.resolve("inbox/" + active.id() + ".json"));
          Files.delete(root.resolve("pending.json")); active = null; busy = false; phase = "ready";
        }
        else {
          if (state.revision != active.before().revision || !SceneModel.JSON.toJson(state).equals(SceneModel.JSON.toJson(active.before()))) throw new IOException("Recovery state does not match journal");
          beginRollback("recovered interrupted request");
        }
      } else { busy = false; phase = "ready"; }
      Bukkit.getScheduler().runTaskTimer(plugin, this::tick, 1, 1);
      Bukkit.getScheduler().runTaskTimer(plugin, this::publishContext, 20, 40);
      Bukkit.getScheduler().runTaskTimer(plugin, this::poll, 20, 20);
      plugin.getLogger().info("Intuition Engine ready; local inbox " + root.resolve("inbox") + "; revision " + state.revision);
    } catch (Exception e) { fault(e); }
  }
  private <T> T read(Path file, Class<T> type) throws IOException {
    if (Files.size(file) > 4_000_000 || Files.isSymbolicLink(file)) throw new IOException("Oversized or symbolic scene file");
    try { return SceneModel.JSON.fromJson(Files.readString(file), type); }
    catch (RuntimeException e) { throw new IOException("Invalid scene JSON", e); }
  }
  private void write(String name, String contents) throws IOException {
    Path destination = root.resolve(name), temp = destination.resolveSibling(destination.getFileName() + ".tmp");
    Files.writeString(temp, contents, StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING);
    try { Files.move(temp, destination, StandardCopyOption.ATOMIC_MOVE, StandardCopyOption.REPLACE_EXISTING); }
    catch (AtomicMoveNotSupportedException e) { Files.move(temp, destination, StandardCopyOption.REPLACE_EXISTING); }
  }
  private void later(Runnable task) { if (!closing) Bukkit.getScheduler().runTask(plugin, task); }
  private void io(Callable<Void> task, Runnable success) {
    disk.submit(() -> {
      try { task.call(); later(success); }
      catch (Exception e) { later(() -> fault(e)); }
    });
  }
  private void fault(Exception error) {
    failed = true; busy = true; phase = "failed: " + error.getMessage();
    plugin.getLogger().log(java.util.logging.Level.SEVERE, "Intuition Engine stopped; journal retained for recovery", error);
    announce("Intuition Engine needs attention; recovery files are retained.");
  }
  private void announce(String message) {
    plugin.getLogger().info(message);
    for (Player player : world == null ? List.<Player>of() : world.getPlayers()) player.sendMessage(message);
  }
  private void poll() {
    if (failed) return;
    if (active != null && phase.equals("applying")) {
      try { if (Files.deleteIfExists(root.resolve("inbox/" + active.id() + ".cancel"))) beginRollback("cancelled by local request"); }
      catch (Exception e) { fault(e); }
    }
    if (busy) return;
    busy = true; phase = "checking inbox";
    disk.submit(() -> {
      try (DirectoryStream<Path> stream = Files.newDirectoryStream(root.resolve("inbox"), "*.json")) {
        Path selected = null;
        for (Path file : stream) { selected = file; break; }
        if (selected == null) { later(() -> { busy = false; phase = "ready"; }); return; }
        Path file = selected;
        String filename = file.getFileName().toString();
        if (!filename.matches("[a-z][a-z0-9-]{0,63}\\.json")) throw new IOException("Invalid inbox filename; remove manually: " + filename);
        String id = filename.substring(0, filename.length()-5);
        if (Files.exists(root.resolve("results/" + filename))) { Files.delete(file); later(() -> { busy = false; phase = "ready"; }); return; }
        SceneModel.Request request;
        try {
          if (Files.isSymbolicLink(file) || Files.size(file) > 65536) throw new IOException("Request must be a regular file <=64 KiB");
          request = SceneModel.parse(Files.readString(file));
          if (!id.equals(request.id())) throw new IllegalArgumentException("Filename must match request ID");
        } catch (Exception e) {
          write("results/" + filename, result(id, "rejected", e.getMessage(), 0)); Files.delete(file);
          later(() -> { busy = false; phase = "ready"; }); return;
        }
        later(() -> prepare(request));
      } catch (Exception e) { later(() -> fault(e)); }
    });
  }
  private String result(String id, String status, String message, int count) {
    return SceneModel.JSON.toJson(Map.of("id", id, "status", status, "message", message == null ? "Unknown failure" : message, "blocks", count));
  }
  private Block block(String key) { SceneModel.Cell c = SceneModel.Cell.parse(key); return world.getBlockAt(c.x(), c.y(), c.z()); }
  private String actual(String key) { return block(key).getBlockData().getAsString(); }
  private void validateJournal(SceneModel.Journal journal) {
    if (journal == null || !journal.id().matches("[a-z][a-z0-9-]{0,63}") || journal.oldBlocks() == null || journal.newBlocks() == null || !journal.oldBlocks().keySet().equals(journal.newBlocks().keySet()) || journal.oldBlocks().size() > 8192) throw new IllegalArgumentException("Invalid recovery journal");
    SceneModel.check(journal.before()); SceneModel.check(journal.after());
    for (String key : journal.oldBlocks().keySet()) {
      SceneModel.Cell.parse(key);
      for (String material : List.of(journal.oldBlocks().get(key), journal.newBlocks().get(key))) {
        if (!SceneModel.MATERIALS.contains(material.replaceFirst("^minecraft:", ""))) throw new IllegalArgumentException("Unsafe journal material");
        palette.computeIfAbsent(material, Bukkit::createBlockData);
      }
    }
  }
  private void prepare(SceneModel.Request request) {
    try {
      if (request.revision() != state.revision) throw new IllegalArgumentException("Stale revision; read context.json again");
      actionMessage = null;
      SceneModel.State after;
      Map<String,String> old = new LinkedHashMap<>(), next = new LinkedHashMap<>();
      if (request.action().equals("undo")) {
        SceneModel.Journal prior = read(root.resolve("history/" + state.lastJob + ".json"), SceneModel.Journal.class);
        validateJournal(prior);
        if (prior.after().revision != state.revision) throw new IllegalArgumentException("Latest revision has no matching undo");
        after = SceneModel.copy(prior.before()); after.revision = state.revision + 1; after.lastJob = request.id();
        for (String key : prior.newBlocks().keySet()) {
          if (!actual(key).equals(prior.newBlocks().get(key))) throw new IllegalArgumentException("World changed outside engine; undo refused at " + key);
          old.put(key, actual(key)); next.put(key, prior.oldBlocks().get(key));
        }
      } else {
        after = SceneModel.next(state, request);
        if (request.action().equals("act")) actionMessage = SceneRules.explain(after,state.rules.get(SceneModel.id(request.payload(),"rule")).message());
        Set<String> touched = new LinkedHashSet<>();
        Set<String> ids = new LinkedHashSet<>(state.objects.keySet()); ids.addAll(after.objects.keySet());
        for (String id : ids) if (!Objects.equals(state.objects.get(id),after.objects.get(id))) touched.add(id);
        if (request.action().equals("act")) for (var effect : state.rules.get(SceneModel.id(request.payload(),"rule")).effects()) touched.add(effect.source());
        Set<String> keys = new LinkedHashSet<>();
        for (String id : touched) {
          if (state.objects.containsKey(id)) keys.addAll(state.objects.get(id).blocks().keySet());
          if (after.objects.containsKey(id)) keys.addAll(after.objects.get(id).blocks().keySet());
        }
        Map<String,String> beforeBlocks = new HashMap<>(), afterBlocks = new HashMap<>();
        for (var o : state.objects.values()) beforeBlocks.putAll(o.blocks());
        for (var o : after.objects.values()) afterBlocks.putAll(o.blocks());
        for (String key : keys) {
          String expected = beforeBlocks.getOrDefault(key,"minecraft:air");
          if (!actual(key).equals(expected)) throw new IllegalArgumentException("Existing creation or external edit at " + key + "; nothing changed");
          old.put(key,expected); next.put(key,afterBlocks.getOrDefault(key,"minecraft:air"));
        }
      }
      active = new SceneModel.Journal(request.id(), SceneModel.copy(state), after, old, next);
      validateJournal(active); cursor = 0; rollback = false;
      cells = new ArrayList<>(next.keySet()); phase = "saving recovery journal";
      String journal = SceneModel.JSON.toJson(active), accepted = result(active.id(), "accepted", "Validated; preparing live edit", cells.size());
      io(() -> { write("pending.json", journal); write("results/" + request.id() + ".json", accepted); return null; }, () -> { phase = "applying"; announce("Intuition: building " + request.id() + " (" + cells.size() + " blocks)."); });
    } catch (Exception e) {
      active = null;
      String rejected = result(request.id(), "rejected", e.getMessage(), 0);
      io(() -> { write("results/" + request.id() + ".json", rejected); Files.deleteIfExists(root.resolve("inbox/" + request.id() + ".json")); return null; }, () -> { busy = false; phase = "ready"; });
    }
  }
  private void beginRollback(String reason) {
    for (String key : active.oldBlocks().keySet()) {
      String value = actual(key);
      if (!value.equals(active.oldBlocks().get(key)) && !value.equals(active.newBlocks().get(key))) throw new IllegalArgumentException("Recovery conflict at " + key);
    }
    rollback = true; rollbackReason = reason; cells = new ArrayList<>(active.oldBlocks().keySet()); cursor = 0; phase = "rolling back";
  }
  private void tick() {
    if (failed || active == null || !(phase.equals("applying") || phase.equals("rolling back"))) return;
    try {
      long deadline = System.nanoTime() + 2_000_000;
      int count = 0;
      while (cursor < cells.size() && count++ < 100 && System.nanoTime() < deadline) {
        String key = cells.get(cursor++), material = (rollback ? active.oldBlocks() : active.newBlocks()).get(key);
        String current = actual(key);
        if (!current.equals(active.oldBlocks().get(key)) && !current.equals(active.newBlocks().get(key))) throw new IOException("Concurrent world edit at " + key);
        block(key).setBlockData(palette.get(material), false);
      }
      if (cursor % 500 < 100) for (Player p : world.getPlayers()) p.sendActionBar(net.kyori.adventure.text.Component.text("Intuition " + phase + ": " + cursor + "/" + cells.size()));
      if (cursor == cells.size()) finish();
    } catch (Exception e) { fault(e); }
  }
  private void finish() {
    phase = "committing";
    SceneModel.Journal journal = active;
    boolean cancelled = rollback;
    SceneModel.State target = cancelled ? journal.before() : journal.after();
    String saved = SceneModel.JSON.toJson(target), history = SceneModel.JSON.toJson(journal);
    String message = cancelled ? rollbackReason : actionMessage == null ? "Live edit complete; revision " + target.revision : actionMessage;
    String output = result(journal.id(), cancelled ? "cancelled" : "completed", message, cells.size());
    // Save chunks before marking the semantic transaction committed. This runs only at a bounded job boundary.
    if (!cells.isEmpty()) world.save();
    io(() -> {
      if (!cancelled) write("history/" + journal.id() + ".json", history);
      write("state.json", saved); write("results/" + journal.id() + ".json", output);
      Files.deleteIfExists(root.resolve("inbox/" + journal.id() + ".json"));
      Files.delete(root.resolve("pending.json")); return null;
    }, () -> { state = target; active = null; busy = false; phase = "ready"; announce("Intuition: " + message); publishContext(); });
  }
  private void publishContext() {
    if (contextPending || failed) return;
    List<Map<String,Object>> players = new ArrayList<>();
    for (Player player : Bukkit.getOnlinePlayers()) {
      Location l = player.getLocation();
      Map<String,Object> p = new LinkedHashMap<>();
      p.put("name", player.getName()); p.put("uuid", player.getUniqueId().toString()); p.put("world", l.getWorld().getKey().toString());
      p.put("position", List.of(l.getX(), l.getY(), l.getZ())); p.put("yaw", l.getYaw()); p.put("pitch", l.getPitch());
      Block target = player.getTargetBlockExact(12);
      if (target != null) { p.put("target", List.of(target.getX(), target.getY(), target.getZ())); p.put("object", objectAt(target).map(SceneModel.ObjectSpec::id).orElse("")); }
      players.add(p);
    }
    Map<String,Object> context = new LinkedHashMap<>();
    context.put("version", 1); context.put("updatedAt", java.time.Instant.now().toString()); context.put("revision", state.revision); context.put("phase", phase);
    context.put("activeJob", active == null ? "" : active.id()); context.put("progress", cursor); context.put("total", cells.size());
    Map<String,Object> meanings = new LinkedHashMap<>();
    for (var o : state.objects.values()) meanings.put(o.id(), Map.of("title", o.title(), "explanation", o.explanation(), "kind", o.kind(), "relatesTo", o.relatesTo(), "blockCount", o.blocks().size()));
    context.put("variables",state.variables); context.put("rules",state.rules); context.put("guides",state.guides); context.put("provenance",state.provenance);
    context.put("world", world.getKey().toString()); context.put("players", players); context.put("objects", meanings);
    String output = SceneModel.JSON.toJson(context);
    contextPending = true;
    io(() -> { write("context.json", output); return null; }, () -> contextPending = false);
  }
  private Optional<SceneModel.ObjectSpec> objectAt(Block block) {
    if (!block.getWorld().equals(world)) return Optional.empty();
    String key = new SceneModel.Cell(block.getX(), block.getY(), block.getZ()).key();
    return state.objects.values().stream().filter(o -> o.blocks().containsKey(key)).findFirst();
  }
  private void inspect(Player player) {
    Block target = player.getTargetBlockExact(12);
    Optional<SceneModel.ObjectSpec> object = target == null ? Optional.empty() : objectAt(target);
    if (object.isEmpty()) { player.sendMessage("Point at a named scene object within 12 blocks, then inspect again."); return; }
    SceneModel.ObjectSpec o = object.get();
    player.sendMessage(o.title() + " [" + o.kind() + "]: " + o.explanation());
    if (!o.relatesTo().isEmpty()) player.sendMessage("Related objects: " + String.join(", ", o.relatesTo()));
  }
  private File snapshot(Player player) { return root.resolve("visitors/" + player.getUniqueId() + ".yml").toFile(); }
  void leave(Player player) throws IOException {
    ViewerState saved = visitors.get(player.getUniqueId());
    if (saved == null && snapshot(player).exists()) saved = ViewerState.load(snapshot(player));
    if (saved == null) return;
    saved.restore(player); Files.delete(snapshot(player).toPath()); visitors.remove(player.getUniqueId());
  }
  private void visit(Player player) throws IOException {
    if (failed || world == null) throw new IOException("Lab is not ready");
    plugin.leaveTabletop(player);
    ViewerState saved = visitors.get(player.getUniqueId());
    if (saved == null) { saved = snapshot(player).exists() ? ViewerState.load(snapshot(player)) : ViewerState.captureFull(player); saved.save(snapshot(player)); visitors.put(player.getUniqueId(), saved); }
    player.getInventory().clear(); player.setGameMode(GameMode.ADVENTURE); player.setAllowFlight(true); player.setFlying(true); player.setGravity(true);
    if (!player.teleport(new Location(world, 128.5, 85, 32.5, 180, 45))) throw new IOException("Lab teleport refused");
    player.sendMessage("Intuition lab: fly with the normal controls. Point and use an empty hand to inspect. Use a component again to perform its action; point at a guide and /intuition ask <topic>. /intuition leave returns with your inventory.");
  }
  @Override public boolean onCommand(CommandSender sender, Command command, String label, String[] args) {
    String action = args.length == 0 ? "visit" : args[0];
    try {
      if(sender instanceof Player player && (action.equals("act") || action.equals("ask")) && args.length==2) {
        if(action.equals("act")) act(player,args[1]); else ask(player,args[1]); return true;
      }
      if (sender instanceof Player player && Set.of("visit", "leave", "inspect").contains(action) && args.length <= 1) {
        switch (action) { case "visit" -> visit(player); case "leave" -> leave(player); case "inspect" -> inspect(player); }
        return true;
      }
      if (!sender.hasPermission("dadeto.tabletop.admin")) { sender.sendMessage("That scene control belongs to the DM."); return true; }
      switch (action) {
        case "status" -> sender.sendMessage("Intuition " + phase + "; revision " + state.revision + "; objects " + state.objects.size() + "; progress " + cursor + "/" + cells.size());
        case "selftest" -> sender.sendMessage(SceneModelCheck.run());
        case "verify" -> {
          int mismatches = 0;
          for (var o : state.objects.values()) for (var b : o.blocks().entrySet()) if (!actual(b.getKey()).equals(b.getValue())) mismatches++;
          sender.sendMessage("Intuition verification: " + mismatches + " mismatches; revision " + state.revision);
        }
        case "cancel" -> {
          if (active != null && phase.equals("applying")) { beginRollback("cancelled by DM"); sender.sendMessage("Rolling back active request"); }
          else sender.sendMessage("No cancellable edit; wait for commit then submit undo if needed");
        }
        case "visit", "return" -> {
          if (args.length != 2) throw new IllegalArgumentException("intuition " + action + " <exact player name>");
          Player player = Bukkit.getPlayerExact(args[1]);
          if (player == null) throw new IllegalArgumentException("Player is not online");
          if (action.equals("visit")) visit(player); else leave(player);
        }
        default -> sender.sendMessage("intuition visit | leave | inspect | status | verify | selftest | cancel");
      }
    } catch (Exception e) { sender.sendMessage("Intuition: " + e.getMessage()); plugin.getLogger().warning("Scene command failed: " + e); }
    return true;
  }
  @EventHandler public void onUse(PlayerInteractEvent event) {
    Player player=event.getPlayer();
    if (!visitors.containsKey(player.getUniqueId())) return;
    event.setCancelled(true);
    if (event.getHand()!=org.bukkit.inventory.EquipmentSlot.HAND) return;
    long now=System.currentTimeMillis();
    if (now-lastUse.getOrDefault(player.getUniqueId(),0L)<500) return;
    lastUse.put(player.getUniqueId(),now);
    Block target=player.getTargetBlockExact(12);
    Optional<SceneModel.ObjectSpec> object=target==null?Optional.empty():objectAt(target);
    if(object.isEmpty()) { inspect(player); return; }
    List<SceneRules.Rule> choices=choices(object.get().id());
    Armed previous=armed.remove(player.getUniqueId());
    if(choices.size()==1 && previous!=null && previous.object().equals(object.get().id()) && previous.revision()==state.revision && now-previous.at()<10000) {
      act(player,choices.getFirst().id()); return;
    }
    inspect(player);
    if(choices.size()==1) {
      armed.put(player.getUniqueId(),new Armed(object.get().id(),state.revision,now));
      player.sendMessage("Use again within 10 seconds: "+choices.getFirst().label());
    } else if(!choices.isEmpty()) player.sendMessage("Choose /intuition act "+String.join(" | ",choices.stream().map(SceneRules.Rule::id).toList()));
    if(state.guides.containsKey(object.get().id())) player.sendMessage("Guide topics: "+String.join(", ",state.guides.get(object.get().id()).topics().keySet())+". Use /intuition ask <topic> while pointing here.");
  }
  private List<SceneRules.Rule> choices(String object) {
    return state.rules.values().stream().filter(r -> r.trigger().equals(object) && SceneRules.available(state,r.requires())).toList();
  }
  private void act(Player player,String ruleId) {
    if(busy || failed) { player.sendMessage("An edit is finishing. Inspect and try again shortly."); return; }
    Block target=player.getTargetBlockExact(12);
    Optional<SceneModel.ObjectSpec> object=target==null?Optional.empty():objectAt(target);
    SceneRules.Rule rule=state.rules.get(ruleId);
    if(!visitors.containsKey(player.getUniqueId()) || rule==null || object.isEmpty() || !object.get().id().equals(rule.trigger())) { player.sendMessage("Point at the action's object in the lab first."); return; }
    JsonObject request=new JsonObject(); request.addProperty("version",1); request.addProperty("id","use-"+UUID.randomUUID()); request.addProperty("revision",state.revision); request.addProperty("action","act"); request.addProperty("rule",ruleId); request.addProperty("actor",player.getUniqueId().toString());
    busy=true;
    prepare(SceneModel.parse(request.toString()));
  }
  private void ask(Player player,String topicId) {
    Block target=player.getTargetBlockExact(12);
    Optional<SceneModel.ObjectSpec> object=target==null?Optional.empty():objectAt(target);
    if(object.isEmpty() || !state.guides.containsKey(object.get().id())) { player.sendMessage("Point at an interactive guide within 12 blocks first."); return; }
    SceneRules.Guide guide=state.guides.get(object.get().id());
    SceneRules.Topic topic=guide.topics().get(topicId);
    if(topic==null) { player.sendMessage("Available guide topics: "+String.join(", ",guide.topics().keySet())+". Bring other questions to Codex for a live revision."); return; }
    if(!SceneRules.available(state,topic.requires())) { player.sendMessage("That comparison needs a different experiment state. Inspect the remaining components first."); return; }
    player.sendMessage(guide.role()+": "+guide.disclaimer());
    player.sendMessage("["+topic.kind()+"] "+SceneRules.explain(state,topic.text()));
  }
  @EventHandler public void onJoin(PlayerJoinEvent event) {
    Player player = event.getPlayer();
    if (snapshot(player).exists()) Bukkit.getScheduler().runTaskLater(plugin, () -> { if (player.isOnline()) try { visit(player); } catch (Exception e) { player.sendMessage("Lab return snapshot retained: " + e.getMessage()); } }, 40);
  }
  @EventHandler public void onQuit(PlayerQuitEvent event) { visitors.remove(event.getPlayer().getUniqueId()); armed.remove(event.getPlayer().getUniqueId()); lastUse.remove(event.getPlayer().getUniqueId()); }
  @EventHandler public void onDamage(org.bukkit.event.entity.EntityDamageEvent event) { if (visitors.containsKey(event.getEntity().getUniqueId())) event.setCancelled(true); }
  void close() { closing = true; disk.shutdown(); try { disk.awaitTermination(10, TimeUnit.SECONDS); } catch (InterruptedException e) { Thread.currentThread().interrupt(); } }
}
