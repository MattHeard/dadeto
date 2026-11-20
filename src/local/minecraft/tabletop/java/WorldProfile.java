package net.mattheard.tabletop;

import java.io.*;
import java.nio.file.Files;
import java.util.*;
import org.bukkit.*;
import org.bukkit.attribute.Attribute;
import org.bukkit.configuration.file.YamlConfiguration;
import org.bukkit.entity.Player;
import org.bukkit.inventory.ItemStack;
import org.bukkit.potion.PotionEffect;

/** Adds isolated world-group vitals/ender storage to the proven durable viewer snapshot. */
final class WorldProfile {
  final ViewerState view;
  WorldProfile(ViewerState view) {this.view=view;}
  static final Set<String> GROUPS=Set.of("survival","hub","build");
  String group() {return view.original.getString("group");}
  static GameMode mode(String group) {return switch(group){case "survival"->GameMode.SURVIVAL;case "hub"->GameMode.ADVENTURE;case "build"->GameMode.CREATIVE;default->throw new IllegalArgumentException("Unknown world group");};}
  static List<ItemStack> items(ItemStack[] source) {List<ItemStack> result=new ArrayList<>();for(ItemStack item:source)result.add(item==null?null:item.clone());return result;}
  static WorldProfile capture(Player p,String group) {
    WorldProfile profile=new WorldProfile(ViewerState.captureFull(p));
    profile.view.original.set("schema",1);profile.view.original.set("group",group);return profile;
  }
  static void captureExtras(YamlConfiguration y,Player p) {
    y.set("player-state-version",1);y.set("ender",items(p.getEnderChest().getContents()));
    y.set("level",p.getLevel());y.set("experience",p.getExp());y.set("total-experience",p.getTotalExperience());
    y.set("health",p.getHealth());y.set("absorption",p.getAbsorptionAmount());y.set("food",p.getFoodLevel());y.set("saturation",p.getSaturation());y.set("exhaustion",p.getExhaustion());
    y.set("air",p.getRemainingAir());y.set("fire",p.getFireTicks());y.set("effects",new ArrayList<>(p.getActivePotionEffects()));y.set("respawn",p.getRespawnLocation());
  }
  static WorldProfile fresh(String group,Location location) {
    YamlConfiguration y=new YamlConfiguration();y.set("player-state-version",1);y.set("schema",1);y.set("group",group);y.set("return",location);
    y.set("mode",mode(group).name());y.set("allow-flight",group.equals("build"));y.set("flying",group.equals("build"));y.set("gravity",true);y.set("held-slot",0);
    y.set("inventory",new ArrayList<>(Collections.nCopies(41,null)));y.set("ender",new ArrayList<>(Collections.nCopies(27,null)));
    y.set("level",0);y.set("experience",0);y.set("total-experience",0);y.set("health",20);y.set("absorption",0);y.set("food",20);y.set("saturation",5);y.set("exhaustion",0);y.set("air",300);y.set("fire",0);y.set("effects",new ArrayList<>());
    return new WorldProfile(new ViewerState(y));
  }
  static WorldProfile load(File file) throws IOException {
    if(Files.isSymbolicLink(file.toPath())||file.length()>2_000_000)throw new IOException("Invalid or oversized world profile");
    WorldProfile profile=new WorldProfile(ViewerState.load(file));profile.validate();return profile;
  }
  void save(File file) throws IOException {validate();view.save(file);}
  private static double number(YamlConfiguration y,String key,double low,double high) throws IOException {
    Object raw=y.get(key);if(!(raw instanceof Number n)||!Double.isFinite(n.doubleValue())||n.doubleValue()<low||n.doubleValue()>high)throw new IOException("Invalid profile field: "+key);return ((Number)raw).doubleValue();
  }
  private static ItemStack[] slots(YamlConfiguration y,String key,int count) throws IOException {
    List<?> source=y.getList(key);if(source==null||source.size()!=count)throw new IOException("Invalid "+key+" inventory shape");
    ItemStack[] result=new ItemStack[count];for(int i=0;i<count;i++){Object item=source.get(i);if(item!=null&&!(item instanceof ItemStack))throw new IOException("Invalid saved item");result[i]=item==null?null:((ItemStack)item).clone();}return result;
  }
  void validate() throws IOException {
    YamlConfiguration y=view.original;
    if(y.getInt("schema")!=1||!GROUPS.contains(group())||y.getLocation("return")==null||y.getLocation("return").getWorld()==null)throw new IOException("Incomplete world profile; retained for recovery");
    try{GameMode.valueOf(y.getString("mode"));}catch(Exception e){throw new IOException("Invalid saved mode",e);}
    slots(y,"inventory",41);number(y,"held-slot",0,8);
    for(String flag:List.of("allow-flight","flying","gravity"))if(!y.isBoolean(flag))throw new IOException("Invalid saved ability");
    Location location=y.getLocation("return");if(!Double.isFinite(location.getX())||!Double.isFinite(location.getY())||!Double.isFinite(location.getZ())||!Float.isFinite(location.getYaw())||!Float.isFinite(location.getPitch()))throw new IOException("Invalid saved position");
    validateExtras(y);
  }
  static void validateExtras(YamlConfiguration y) throws IOException {
    if(y.getInt("player-state-version")!=1)throw new IOException("Missing full player snapshot");
    slots(y,"ender",27);number(y,"level",0,Integer.MAX_VALUE);number(y,"total-experience",0,Integer.MAX_VALUE);number(y,"experience",0,1);
    number(y,"health",0.001,2048);number(y,"absorption",0,2048);number(y,"food",0,20);number(y,"saturation",0,20);number(y,"exhaustion",0,40);number(y,"air",-20,Integer.MAX_VALUE);number(y,"fire",Integer.MIN_VALUE,Integer.MAX_VALUE);
    List<?> effects=y.getList("effects");if(effects==null||effects.size()>64||effects.stream().anyMatch(e->!(e instanceof PotionEffect)))throw new IOException("Invalid saved potion effects");
    Location respawn=y.getLocation("respawn");if(respawn!=null&&respawn.getWorld()==null)throw new IOException("Saved respawn world unavailable");
  }
  void apply(Player p,boolean enforceGroup) throws Exception {
    validate();YamlConfiguration y=view.original;YamlConfiguration copy=new YamlConfiguration();copy.loadFromString(y.saveToString());
    if(enforceGroup){copy.set("mode",mode(group()).name());copy.set("allow-flight",group().equals("build"));copy.set("flying",group().equals("build")&&y.getBoolean("flying"));copy.set("gravity",true);}
    new ViewerState(copy).restore(p);
  }
  static void applyExtras(YamlConfiguration y,Player p) throws Exception {
    p.getEnderChest().setContents(slots(y,"ender",p.getEnderChest().getSize()));
    for(PotionEffect effect:new ArrayList<>(p.getActivePotionEffects()))p.removePotionEffect(effect.getType());
    for(Object effect:Objects.requireNonNull(y.getList("effects")))p.addPotionEffect((PotionEffect)effect);
    p.setLevel(y.getInt("level"));p.setExp((float)y.getDouble("experience"));p.setTotalExperience(y.getInt("total-experience"));
    p.setHealth(Math.min(y.getDouble("health"),Objects.requireNonNull(p.getAttribute(Attribute.MAX_HEALTH)).getValue()));p.setAbsorptionAmount(y.getDouble("absorption"));p.setFoodLevel(y.getInt("food"));p.setSaturation((float)y.getDouble("saturation"));p.setExhaustion((float)y.getDouble("exhaustion"));
    p.setRespawnLocation(y.getLocation("respawn"),false);p.setRemainingAir(Math.min(y.getInt("air"),p.getMaximumAir()));p.setFireTicks(y.getInt("fire"));p.setFallDistance(0);
  }
}
