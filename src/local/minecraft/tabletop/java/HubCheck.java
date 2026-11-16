package net.mattheard.tabletop;

import java.lang.reflect.Proxy;
import java.nio.file.*;
import java.util.*;
import org.bukkit.*;
import org.bukkit.entity.Player;
import org.bukkit.event.player.PlayerTeleportEvent;
import org.bukkit.inventory.*;
import org.bukkit.potion.*;

/** Real-world route/profile integration with a synthetic player and separate private files. */
final class HubCheck {
  private static void require(boolean condition,String label){if(!condition)throw new IllegalStateException("Hub check: "+label);}
  static String run(HubWorlds live) throws Exception {
    if(!Bukkit.getOnlinePlayers().isEmpty())throw new IllegalArgumentException("Run this isolated check with no connected players");
    if(!live.ready)throw new IllegalArgumentException("Hub is not ready");
    HubWorlds route=new HubWorlds(live.plugin,live.root.resolve("selftest"));route.worlds.putAll(live.worlds);route.ready=true;
    Map<String,Object> data=new HashMap<>();World survival=route.worlds.get("survival");
    Location start=survival.getSpawnLocation();start.setY(survival.getHighestBlockYAt(start.getBlockX(),start.getBlockZ())+1);start.setX(start.getBlockX()+0.5);start.setZ(start.getBlockZ()+0.5);start.setYaw(27);start.setPitch(13);data.put("original-location",start.clone());
    data.put("location",start);data.put("mode",GameMode.SURVIVAL);data.put("allow-flight",false);data.put("flying",false);data.put("gravity",true);data.put("held",3);
    ItemStack[] initial=new ItemStack[41];initial[2]=new ItemStack(Material.DIAMOND,7);var meta=initial[2].getItemMeta();meta.displayName(net.kyori.adventure.text.Component.text("Survival original"));initial[2].setItemMeta(meta);initial[36]=new ItemStack(Material.DIAMOND_BOOTS);initial[40]=new ItemStack(Material.TORCH,12);data.put("contents",initial);
    ItemStack[] ender=new ItemStack[27];ender[4]=new ItemStack(Material.EMERALD,3);data.put("ender",ender);
    data.put("level",8);data.put("exp",0.4f);data.put("total",120);data.put("health",9.0);data.put("absorption",2.0);data.put("food",11);data.put("saturation",3.0f);data.put("exhaustion",1.5f);data.put("air",240);data.put("fire",-20);data.put("respawn",survival.getSpawnLocation());
    data.put("effects",new ArrayList<>(List.of(new PotionEffect(PotionEffectType.SPEED,1200,1))));data.put("fail-teleport",0);data.put("saves",0);
    PlayerInventory inventory=(PlayerInventory)Proxy.newProxyInstance(PlayerInventory.class.getClassLoader(),new Class<?>[]{PlayerInventory.class},(o,m,a)->switch(m.getName()){
      case "getContents"->data.get("contents");case "setContents"->{data.put("contents",a[0]);yield null;}case "getHeldItemSlot"->data.get("held");case "setHeldItemSlot"->{data.put("held",a[0]);yield null;}default->throw new UnsupportedOperationException(m.getName());});
    Inventory chest=(Inventory)Proxy.newProxyInstance(Inventory.class.getClassLoader(),new Class<?>[]{Inventory.class},(o,m,a)->switch(m.getName()){
      case "getContents"->data.get("ender");case "setContents"->{data.put("ender",a[0]);yield null;}case "getSize"->27;default->throw new UnsupportedOperationException(m.getName());});
    Player player=(Player)Proxy.newProxyInstance(Player.class.getClassLoader(),new Class<?>[]{Player.class},(o,m,a)->{
      String name=m.getName();
      Map<String,String> getters=Map.ofEntries(Map.entry("getLevel","level"),Map.entry("getExp","exp"),Map.entry("getTotalExperience","total"),Map.entry("getHealth","health"),Map.entry("getAbsorptionAmount","absorption"),Map.entry("getFoodLevel","food"),Map.entry("getSaturation","saturation"),Map.entry("getExhaustion","exhaustion"),Map.entry("getRemainingAir","air"),Map.entry("getFireTicks","fire"),Map.entry("getRespawnLocation","respawn"),Map.entry("getGameMode","mode"),Map.entry("getAllowFlight","allow-flight"),Map.entry("isFlying","flying"),Map.entry("hasGravity","gravity"),Map.entry("getActivePotionEffects","effects"));
      if(getters.containsKey(name))return data.get(getters.get(name));
      String setter=name.startsWith("set")?"get"+name.substring(3):"";
      if(name.equals("setFlying"))setter="isFlying";if(name.equals("setGravity"))setter="hasGravity";
      if(getters.containsKey(setter)){data.put(getters.get(setter),a[0]);return null;}
      return switch(name){
        case "getUniqueId"->UUID.fromString("daded000-1a01-2000-8000-000000000002");case "getName"->"Hub integration fixture";case "getLocation"->((Location)data.get("location")).clone();case "getWorld"->((Location)data.get("location")).getWorld();
        case "getAttribute"->Proxy.newProxyInstance(org.bukkit.attribute.AttributeInstance.class.getClassLoader(),new Class<?>[]{org.bukkit.attribute.AttributeInstance.class},(attribute,method,values)->{if(method.getName().equals("getValue"))return 20.0;throw new UnsupportedOperationException(method.getName());});
        case "getInventory"->inventory;case "getEnderChest"->chest;case "getMaxHealth"->20.0;case "getMaximumAir"->300;case "isDead"->false;case "isOnline"->true;
        case "teleport"->{if((int)data.get("fail-teleport")>0){data.put("fail-teleport",(int)data.get("fail-teleport")-1);yield false;}data.put("location",((Location)a[0]).clone());yield true;}
        case "saveData"->{data.put("saves",(int)data.get("saves")+1);yield null;}case "closeInventory","sendMessage","setFallDistance"->null;
        case "removePotionEffect"->{List<PotionEffect> next=effects(data);next.removeIf(e->e.getType().equals(a[0]));data.put("effects",next);yield null;}
        case "addPotionEffect"->{List<PotionEffect> next=effects(data);next.add((PotionEffect)a[0]);data.put("effects",next);yield true;}
        default->throw new UnsupportedOperationException(name);
      };
    });
    Files.createDirectories(route.directory(player));
    // Refuse leftovers from a previous interrupted test rather than hiding them.
    require(!Files.exists(route.pending(player)),"pending test journal requires review");
    ViewerState full=ViewerState.captureFull(player);java.io.File viewer=route.root.resolve("full-viewer.yml").toFile();full.save(viewer);
    data.put("contents",new ItemStack[41]);data.put("ender",new ItemStack[27]);data.put("health",20.0);data.put("food",20);data.put("level",0);data.put("effects",new ArrayList<>());
    ViewerState.load(viewer).restore(player);assertSurvival(player,data,meta.displayName());Files.delete(viewer.toPath());
    route.travel(player,"hub");require(player.getWorld().equals(route.worlds.get("hub"))&&player.getGameMode()==GameMode.ADVENTURE,"hub destination/mode");require(((ItemStack[])data.get("contents"))[2]==null&&player.getLevel()==0&&((ItemStack[])data.get("ender"))[4]==null,"hub isolation");
    route.travel(player,"build");require(player.getGameMode()==GameMode.CREATIVE&&player.getAllowFlight(),"workshop mode");
    ItemStack[] creative=new ItemStack[41];creative[2]=new ItemStack(Material.DIAMOND_BLOCK,64);data.put("contents",creative);data.put("level",3);data.put("effects",new ArrayList<>());
    route.travel(player,"survival");assertSurvival(player,data,meta.displayName());
    route.travel(player,"build");require(((ItemStack[])data.get("contents"))[2].getType()==Material.DIAMOND_BLOCK&&player.getLevel()==3,"workshop persistence");route.travel(player,"survival");assertSurvival(player,data,meta.displayName());
    data.put("fail-teleport",1);boolean refused=false;try{route.travel(player,"build");}catch(java.io.IOException expected){refused=true;}require(refused,"teleport cancellation");assertSurvival(player,data,meta.displayName());require(!Files.exists(route.pending(player)),"rollback journal completed");
    data.put("fail-teleport",2);boolean retained=false;try{route.travel(player,"build");}catch(java.io.IOException expected){retained=true;}
    require(retained&&Files.exists(route.pending(player))&&route.failed.contains(player.getUniqueId()),"double-failure retains/freeze journal");
    var movement=new org.bukkit.event.player.PlayerMoveEvent(player,player.getLocation(),player.getLocation().add(5,0,0));route.onMove(movement);require(movement.getTo().equals(movement.getFrom()),"failed journey movement freeze");
    route.recover(player);require(!route.failed.contains(player.getUniqueId()),"recovery releases freeze");assertSurvival(player,data,meta.displayName());
    WorldProfile.capture(player,"survival").save(route.pending(player).toFile());data.put("contents",new ItemStack[41]);data.put("location",route.worlds.get("build").getSpawnLocation());data.put("mode",GameMode.CREATIVE);
    HubWorlds restarted=new HubWorlds(live.plugin,route.root);restarted.worlds.putAll(route.worlds);restarted.ready=true;restarted.recover(player);assertSurvival(player,data,meta.displayName());require(!Files.exists(route.pending(player)),"restart recovery");
    var blocked=new PlayerTeleportEvent(player,route.worlds.get("build").getSpawnLocation(),survival.getSpawnLocation(),PlayerTeleportEvent.TeleportCause.COMMAND);route.onTeleport(blocked);require(blocked.isCancelled(),"creative escape blocked");
    World nether=Bukkit.getWorlds().stream().filter(w->w.getKey().toString().equals("minecraft:the_nether")).findFirst().orElseThrow();
    var vanilla=new PlayerTeleportEvent(player,survival.getSpawnLocation(),nether.getSpawnLocation(),PlayerTeleportEvent.TeleportCause.NETHER_PORTAL);route.onTeleport(vanilla);require(!vanilla.isCancelled()&&route.group(nether).equals("survival"),"vanilla Nether shares survival");
    Path malformed=route.directory(player).resolve("malformed.yml");Files.writeString(malformed,"mode: SURVIVAL\n");boolean invalid=false;try{WorldProfile.load(malformed.toFile());}catch(Exception expected){invalid=true;}require(invalid&&Files.exists(malformed),"invalid state retained");Files.delete(malformed);
    require((int)data.get("saves")>10,"durable player saves");
    return "PASS Hub: survival/hub/build round trips and full viewer snapshot; named inventory, armor/offhand, ender chest, XP, vitals, effects and respawn isolated; creative state retained; teleport refusal rollback; restart journal recovery; cross-group escape blocked; vanilla Nether shared; invalid profile retained. No real player or original world blocks changed.";
  }
  private static List<PotionEffect> effects(Map<String,Object> data){return new ArrayList<>(((List<?>)data.get("effects")).stream().map(PotionEffect.class::cast).toList());}
  private static void assertSurvival(Player p,Map<String,Object> data,net.kyori.adventure.text.Component name){
    ItemStack[] contents=(ItemStack[])data.get("contents");require(p.getLocation().equals(data.get("original-location")),"last location and orientation");require(p.getWorld().getKey().toString().equals("minecraft:overworld")&&p.getGameMode()==GameMode.SURVIVAL&&!p.getAllowFlight(),"survival world/mode/flight");
    require(contents[2].getType()==Material.DIAMOND&&contents[2].getAmount()==7&&contents[2].getItemMeta().displayName().equals(name),"original named survival item");
    require(contents[36].getType()==Material.DIAMOND_BOOTS&&contents[40].getAmount()==12,"armor/offhand");require(((ItemStack[])data.get("ender"))[4].getAmount()==3,"ender state");
    require(p.getLevel()==8&&Math.abs(p.getExp()-0.4f)<.0001&&p.getTotalExperience()==120,"experience");require(p.getHealth()==9&&p.getFoodLevel()==11&&p.getActivePotionEffects().size()==1&&p.getRespawnLocation()!=null,"vitals/effects/respawn");
  }
}
