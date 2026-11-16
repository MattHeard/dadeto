package net.mattheard.tabletop;

import java.io.*;
import java.nio.file.*;
import java.util.*;
import org.bukkit.*;
import org.bukkit.block.Sign;
import org.bukkit.block.sign.Side;
import org.bukkit.command.*;
import org.bukkit.entity.Player;
import org.bukkit.event.*;
import org.bukkit.event.block.*;
import org.bukkit.event.entity.*;
import org.bukkit.event.player.*;
import org.bukkit.event.inventory.*;
import net.kyori.adventure.text.serializer.plain.PlainTextComponentSerializer;
import net.kyori.adventure.text.Component;

/** Hub/spokes are native connected-world teleports, never server transfers. */
final class HubWorlds implements Listener,CommandExecutor,TabCompleter {
  final TabletopPlugin plugin;
  final Path root;
  final Map<String,World> worlds=new HashMap<>();
  final Set<UUID> moving=new HashSet<>(),failed=new HashSet<>(),joining=new HashSet<>();
  boolean ready;
  HubWorlds(TabletopPlugin plugin,Path root){this.plugin=plugin;this.root=root;}
  void start() {
    Bukkit.getPluginManager().registerEvents(this,plugin);
    for(String name:List.of("hub","survival","worlds","world")){var command=Objects.requireNonNull(plugin.getCommand(name));command.setExecutor(this);command.setTabCompleter(this);}
    Bukkit.getScheduler().runTask(plugin,()->{try{
      worlds.put("survival",Bukkit.getWorlds().stream().filter(w->w.getKey().equals(NamespacedKey.minecraft("overworld"))).findFirst().orElseThrow());
      worlds.put("hub",create("dadeto_hub",8));worlds.put("build",create("dadeto_build",32));ready=true;
      plugin.getLogger().info("Hub/spokes ready: existing survival, hub, workshop and tabletop/lab; isolated player profiles");
    }catch(Exception e){plugin.getLogger().log(java.util.logging.Level.SEVERE,"Hub not ready; existing saves preserved",e);}});
  }
  private void requireOwned(File folder,String name) throws IOException {
    if(!folder.exists())return;
    Path marker=folder.toPath().resolve("dadeto-worlds.marker");
    if(!Files.isRegularFile(marker)||!Files.readString(marker).equals("Dadeto connected worlds v1: "+name+"\n"))throw new IOException("Refusing unowned world: "+folder);
  }
  private World create(String name,int radius) throws Exception {
    File container=Bukkit.getWorldContainer();requireOwned(new File(container,name),name);
    File[] saves=container.listFiles(File::isDirectory);if(saves!=null)for(File save:saves)requireOwned(new File(save,"dimensions/minecraft/"+name),name);
    for(World loaded:Bukkit.getWorlds())if(loaded.getKey().equals(NamespacedKey.minecraft(name)))requireOwned(loaded.getWorldFolder(),name);
    World world=new WorldCreator(name).environment(World.Environment.NORMAL).generator(new EmptyWorld()).generateStructures(false).createWorld();
    if(world==null)throw new IOException("World creation failed");
    Path folder=world.getWorldFolder().toPath();Files.writeString(folder.resolve("dadeto-worlds.marker"),"Dadeto connected worlds v1: "+name+"\n");
    world.setSpawnLocation(0,65,0);world.setDifficulty(Difficulty.PEACEFUL);world.setPVP(false);
    world.setGameRule(GameRules.SPAWN_MOBS,false);world.setGameRule(GameRules.ADVANCE_TIME,false);world.setGameRule(GameRules.ADVANCE_WEATHER,false);world.setGameRule(GameRules.KEEP_INVENTORY,true);world.setTime(6000);world.setStorm(false);world.setThundering(false);
    world.getWorldBorder().setCenter(0,0);world.getWorldBorder().setSize(name.equals("dadeto_hub")?64:512);
    if(!Files.exists(folder.resolve("dadeto-platform.ready"))) {
      for(int x=-radius;x<=radius;x++)for(int z=-radius;z<=radius;z++)world.getBlockAt(x,64,z).setType((x%8==0||z%8==0)?Material.SMOOTH_STONE:Material.STONE_BRICKS,false);
      if(name.equals("dadeto_hub")) {
        for(int n=-radius;n<=radius;n++)for(int edge:new int[]{-radius,radius}){world.getBlockAt(n,65,edge).setType(Material.OAK_FENCE,false);world.getBlockAt(edge,65,n).setType(Material.OAK_FENCE,false);}
        String[] labels={"Survival","Workshop","Tabletop","Intuition lab"};String[] commands={"/survival","/world build","/world tabletop","/world lab"};
        for(int i=0;i<labels.length;i++){
          var block=world.getBlockAt(-5+i*3,65,5);block.setType(Material.OAK_SIGN,false);
          if(block.getState() instanceof Sign sign){for(Side side:Side.values()){sign.getSide(side).line(0,Component.text(labels[i]));sign.getSide(side).line(1,Component.text(commands[i]));}sign.update();}
        }
      }
      world.save();Files.writeString(folder.resolve("dadeto-platform.ready"),"v1\n");
    }
    return world;
  }
  String group(World world) {
    if(world==null)return null;
    for(String name:List.of("hub","build"))if(world.equals(worlds.get(name)))return name;
    return Set.of("minecraft:overworld","minecraft:the_nether","minecraft:the_end").contains(world.getKey().toString())?"survival":null;
  }
  Path directory(Player p){return root.resolve("players").resolve(p.getUniqueId().toString());}
  File profile(Player p,String group){if(!WorldProfile.GROUPS.contains(group))throw new IllegalArgumentException("Invalid group");return directory(p).resolve(group+".yml").toFile();}
  Path pending(Player p){return directory(p).resolve("pending.yml");}
  void recover(Player p) throws Exception {
    if(!Files.exists(pending(p)))return;
    WorldProfile old=WorldProfile.load(pending(p).toFile());
    if(!Objects.equals(old.group(),group(old.view.original.getLocation("return").getWorld())))throw new IOException("Recovery profile world/group mismatch");
    moving.add(p.getUniqueId());try{old.apply(p,false);Files.delete(pending(p));failed.remove(p.getUniqueId());}finally{moving.remove(p.getUniqueId());}
  }
  void travel(Player p,String destination) throws Exception {
    if(!ready)throw new IOException("Worlds are still preparing; try again shortly");
    if(p.isDead())throw new IOException("Respawn before travelling");
    recover(p);
    if(failed.contains(p.getUniqueId()))throw new IOException("A saved journey needs recovery before more travel");
    p.closeInventory();plugin.leaveViews(p);
    if(destination.equals("tabletop")||destination.equals("lab")) {
      String source=group(p.getWorld());if(source==null)throw new IOException("Return from the current activity first");
      WorldProfile.capture(p,source).save(profile(p,source));p.performCommand(destination.equals("tabletop")?"tabletop":"intuition visit");return;
    }
    if(!WorldProfile.GROUPS.contains(destination))throw new IOException("Use /world survival, build, tabletop or lab; /hub returns here");
    String source=group(p.getWorld());if(source==null)throw new IOException("Return from the current activity first");
    if(source.equals(destination)){if(destination.equals("hub"))p.teleport(worlds.get("hub").getSpawnLocation().add(0.5,0,0.5));p.sendMessage("You are already in "+destination+".");return;}
    WorldProfile old=WorldProfile.capture(p,source);old.save(profile(p,source));p.saveData();
    WorldProfile target=profile(p,destination).exists()?WorldProfile.load(profile(p,destination)):WorldProfile.fresh(destination,worlds.get(destination).getSpawnLocation().add(0.5,0,0.5));
    if(!target.group().equals(destination)||!destination.equals(group(target.view.original.getLocation("return").getWorld())))throw new IOException("Target profile world/group mismatch; saved profile retained");
    if(destination.equals("hub"))target.view.original.set("return",worlds.get("hub").getSpawnLocation().add(0.5,0,0.5));
    Location location=target.view.original.getLocation("return");
    if(location.getY()<location.getWorld().getMinHeight()+1||location.getY()>=location.getWorld().getMaxHeight()-1||!location.getBlock().isPassable()||!location.clone().add(0,1,0).getBlock().isPassable())target.view.original.set("return",worlds.get(destination).getSpawnLocation().add(0.5,0,0.5));
    target.save(profile(p,destination));old.save(pending(p).toFile());moving.add(p.getUniqueId());
    try {
      target.apply(p,true);Files.delete(pending(p));p.sendMessage("World: "+destination+". /hub | /survival | /world build | /world tabletop | /world lab");
    } catch(Exception e) {
      try{old.apply(p,false);Files.deleteIfExists(pending(p));}catch(Exception rollback){failed.add(p.getUniqueId());e.addSuppressed(rollback);}
      throw new IOException("Journey failed; original state restored or recovery snapshot retained",e);
    } finally {moving.remove(p.getUniqueId());}
  }
  @Override public boolean onCommand(CommandSender sender,Command command,String label,String[] args) {
    if(command.getName().equals("worlds")&&args.length==2&&args[0].equals("join")) {
      if(!sender.hasPermission("dadeto.tabletop.admin")){sender.sendMessage("DM control");return true;}
      if(!Set.of("on","off").contains(args[1])){sender.sendMessage("worlds join on|off");return true;}
      plugin.getConfig().set("hub-on-join",args[1].equals("on"));plugin.saveConfig();sender.sendMessage("Hub arrival on join: "+args[1]);return true;
    }
    if(command.getName().equals("worlds")&&args.length==1&&args[0].equals("selftest")){
      if(!sender.hasPermission("dadeto.tabletop.admin")){sender.sendMessage("DM control");return true;}
      try{sender.sendMessage(HubCheck.run(this));}catch(Exception e){plugin.getLogger().log(java.util.logging.Level.SEVERE,"Hub check failed",e);sender.sendMessage("FAIL: "+e.getMessage());}return true;
    }
    if(command.getName().equals("worlds")||(command.getName().equals("world")&&args.length==0)){sender.sendMessage("Worlds: /hub, /survival, /world build, /world tabletop, /world lab. Inventory and progress stay with their world.");return true;}
    if(!(sender instanceof Player p)){sender.sendMessage("Use world travel in game");return true;}
    String destination=switch(command.getName()){case "hub"->"hub";case "survival"->"survival";default->args[0].toLowerCase(Locale.ROOT);};
    try{travel(p,destination);}catch(Exception e){sender.sendMessage("Travel: "+e.getMessage());plugin.getLogger().warning("Travel retained state: "+e.getMessage());}return true;
  }
  @Override public List<String> onTabComplete(CommandSender sender,Command command,String alias,String[] args){
    if(command.getName().equals("world")&&args.length==1)return List.of("hub","survival","build","tabletop","lab").stream().filter(name->name.startsWith(args[0].toLowerCase(Locale.ROOT))).toList();
    return List.of();
  }
  private void joinHub(Player p) {
    if(!p.isOnline()||p.isDead())return;
    try{recover(p);if(plugin.getConfig().getBoolean("hub-on-join",true))travel(p,"hub");joining.remove(p.getUniqueId());}
    catch(Exception e){joining.remove(p.getUniqueId());if(Files.exists(pending(p)))failed.add(p.getUniqueId());p.sendMessage("Hub arrival needs attention; your saved state is retained.");plugin.getLogger().log(java.util.logging.Level.SEVERE,"Hub join recovery failed",e);}
  }
  @EventHandler public void onJoin(PlayerJoinEvent event){
    Player p=event.getPlayer();joining.add(p.getUniqueId());if(Files.exists(pending(p)))failed.add(p.getUniqueId());
    Path folder=plugin.getDataFolder().toPath();String id=p.getUniqueId()+".yml";
    boolean returning=Files.exists(folder.resolve("viewers").resolve(id))||Files.exists(folder.resolve("intuition/visitors").resolve(id))||plugin.getConfig().getStringList("queued-visits").contains(p.getName());
    Bukkit.getScheduler().runTaskLater(plugin,()->joinHub(p),returning?60:1);
  }
  private boolean arriving(Player p){return joining.contains(p.getUniqueId())&&plugin.getConfig().getBoolean("hub-on-join",true);}
  @EventHandler public void onQuit(PlayerQuitEvent event){Player p=event.getPlayer();joining.remove(p.getUniqueId());String group=group(p.getWorld());if(group!=null&&!p.isDead()&&!failed.contains(p.getUniqueId())&&!Files.exists(pending(p)))try{WorldProfile.capture(p,group).save(profile(p,group));}catch(Exception e){plugin.getLogger().log(java.util.logging.Level.SEVERE,"World profile save failed; player data preserved",e);}}
  @EventHandler(priority=EventPriority.HIGHEST,ignoreCancelled=true) public void onTeleport(PlayerTeleportEvent event){String from=group(event.getFrom().getWorld()),to=group(event.getTo().getWorld());if(from!=null&&to!=null&&!from.equals(to)&&!moving.contains(event.getPlayer().getUniqueId())){event.setCancelled(true);event.getPlayer().sendMessage("Use /hub or /world to keep your inventories separate.");}}
  boolean blockPortal(World world){String source=group(world);return source!=null&&!source.equals("survival");}
  @EventHandler(ignoreCancelled=true) public void onEntityPortal(EntityPortalEvent event){if(blockPortal(event.getFrom().getWorld()))event.setCancelled(true);}
  @EventHandler(ignoreCancelled=true) public void onPortal(PlayerPortalEvent event){if(blockPortal(event.getFrom().getWorld())){event.setCancelled(true);event.getPlayer().sendMessage("Use /survival for the vanilla Nether and End.");}}
  @EventHandler public void onRespawn(PlayerRespawnEvent event){String source=group(event.getPlayer().getWorld());if(source!=null&&!source.equals("survival"))event.setRespawnLocation(worlds.get(source).getSpawnLocation().add(0.5,0,0.5));if(joining.contains(event.getPlayer().getUniqueId()))Bukkit.getScheduler().runTaskLater(plugin,()->joinHub(event.getPlayer()),2);}
  boolean protectedFromDamage(Player p){return failed.contains(p.getUniqueId())||arriving(p)||p.getWorld().equals(worlds.get("hub"));}
  @EventHandler(ignoreCancelled=true) public void onDamage(EntityDamageEvent event){if(event.getEntity() instanceof Player p&&protectedFromDamage(p)){event.setCancelled(true);if(event.getCause()==EntityDamageEvent.DamageCause.VOID&&p.getWorld().equals(worlds.get("hub")))p.teleport(worlds.get("hub").getSpawnLocation().add(0.5,0,0.5));}}
  @EventHandler public void onBreak(BlockBreakEvent event){if(failed.contains(event.getPlayer().getUniqueId())||event.getBlock().getWorld().equals(worlds.get("hub")))event.setCancelled(true);}
  @EventHandler public void onPlace(BlockPlaceEvent event){if(failed.contains(event.getPlayer().getUniqueId())||event.getBlock().getWorld().equals(worlds.get("hub")))event.setCancelled(true);}
  @EventHandler public void onAttack(EntityDamageByEntityEvent event){if(event.getDamager() instanceof Player p&&protectedFromDamage(p))event.setCancelled(true);}
  @EventHandler public void onFood(FoodLevelChangeEvent event){if(event.getEntity().getWorld().equals(worlds.get("hub"))||(event.getEntity() instanceof Player p&&(failed.contains(p.getUniqueId())||arriving(p))))event.setCancelled(true);}
  @EventHandler public void onDrop(PlayerDropItemEvent event){if(failed.contains(event.getPlayer().getUniqueId())||event.getPlayer().getWorld().equals(worlds.get("hub")))event.setCancelled(true);}
  @EventHandler public void onPickup(EntityPickupItemEvent event){if(event.getEntity() instanceof Player p&&(failed.contains(p.getUniqueId())||arriving(p)||p.getWorld().equals(worlds.get("hub"))))event.setCancelled(true);}
  @EventHandler(ignoreCancelled=true) public void onUse(PlayerInteractEvent event){
    Player p=event.getPlayer();if(failed.contains(p.getUniqueId())){event.setCancelled(true);return;}
    if(!p.getWorld().equals(worlds.get("hub"))||event.getAction()!=Action.RIGHT_CLICK_BLOCK||event.getClickedBlock()==null||!(event.getClickedBlock().getState() instanceof Sign sign))return;
    String text=PlainTextComponentSerializer.plainText().serialize(sign.getSide(Side.FRONT).line(1));
    String destination=switch(text){case "/survival"->"survival";case "/world build"->"build";case "/world tabletop"->"tabletop";case "/world lab"->"lab";default->null;};
    if(destination!=null){event.setCancelled(true);try{travel(p,destination);}catch(Exception e){p.sendMessage("Travel: "+e.getMessage());}}
  }
  @EventHandler public void onInventory(InventoryClickEvent event){if(failed.contains(event.getWhoClicked().getUniqueId()))event.setCancelled(true);}
  @EventHandler public void onDrag(InventoryDragEvent event){if(failed.contains(event.getWhoClicked().getUniqueId()))event.setCancelled(true);}
  @EventHandler public void onMove(PlayerMoveEvent event){if(!(event instanceof PlayerTeleportEvent)&&failed.contains(event.getPlayer().getUniqueId()))event.setTo(event.getFrom());}
}
