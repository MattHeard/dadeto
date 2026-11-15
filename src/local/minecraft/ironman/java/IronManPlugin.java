package net.mattheard.ironman;

import com.google.gson.*;
import com.destroystokyo.paper.profile.ProfileProperty;
import io.papermc.paper.datacomponent.item.ResolvableProfile;
import java.awt.image.BufferedImage;
import javax.imageio.ImageIO;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;
import org.bukkit.*;
import org.bukkit.block.Block;
import org.bukkit.command.*;
import org.bukkit.entity.*;
import org.bukkit.event.*;
import org.bukkit.event.player.*;
import org.bukkit.persistence.PersistentDataType;
import org.bukkit.plugin.java.JavaPlugin;
import org.geysermc.geyser.api.GeyserApi;
import org.geysermc.geyser.api.event.EventRegistrar;
import org.geysermc.geyser.api.event.bedrock.SessionSkinApplyEvent;
import org.geysermc.geyser.api.skin.Skin;
import org.geysermc.geyser.api.skin.SkinGeometry;
import net.kyori.adventure.text.Component;

/** Native mannequin with a fast local leash; model outputs are constrained building intents. */
public final class IronManPlugin extends JavaPlugin implements Listener,CommandExecutor,EventRegistrar {
  static final UUID PROFILE=UUID.fromString("daded000-1a01-2000-8000-000000000001");
  private UUID ownerId;
  private volatile UUID npcId;
  private Mannequin npc;
  private Path root;
  private Construction construction;
  private final ExecutorService disk=Executors.newSingleThreadExecutor(r->{Thread t=new Thread(r,"ironman-disk");t.setDaemon(true);return t;});
  private final AtomicInteger skinPackets=new AtomicInteger();
  private volatile boolean closing;
  private boolean enabled,contextBusy,polling;
  private boolean ready;
  private long ticks;
  private String mode="follow",brainMessage="",lastBrainError="";
  private NamespacedKey marker;
  private double maxObservedDistance;

  @FunctionalInterface interface Work {void run() throws Exception;}
  void io(Work work,Runnable after) {
    disk.submit(()->{try {work.run();if(!closing)Bukkit.getScheduler().runTask(this,after);}catch(Exception e){getLogger().log(java.util.logging.Level.SEVERE,"Iron Man disk operation failed; recovery retained",e);if(!closing)Bukkit.getScheduler().runTask(this,()->{ready=false;contextBusy=false;polling=false;});}});
  }
  <T> T read(String name,Class<T> type) throws IOException {return readAt(root,name,type);}
  <T> T readAt(Path directory,String name,Class<T> type) throws IOException {
    Path p=directory.resolve(name);if(Files.isSymbolicLink(p)||Files.size(p)>2_000_000)throw new IOException("Invalid or oversized controller file");
    return BuildPlan.JSON.fromJson(Files.readString(p),type);
  }
  void write(String name,String value) throws IOException {writeAt(root,name,value);}
  void writeAt(Path directory,String name,String value) throws IOException {
    Path dest=directory.resolve(name);Files.createDirectories(dest.getParent());Path temp=dest.resolveSibling(dest.getFileName()+".tmp");
    Files.writeString(temp,value);try{Files.move(temp,dest,StandardCopyOption.REPLACE_EXISTING,StandardCopyOption.ATOMIC_MOVE);}catch(AtomicMoveNotSupportedException e){Files.move(temp,dest,StandardCopyOption.REPLACE_EXISTING);}
  }
  void result(String id,String status,String message) {
    String data=BuildPlan.JSON.toJson(Map.of("id",id,"status",status,"message",message));io(()->write("results/"+id+".json",data),()->{});
  }
  @Override public void onEnable() {
    saveDefaultConfig();root=getDataFolder().toPath();marker=new NamespacedKey(this,"companion");
    ownerId=UUID.fromString(getConfig().getString("owner"));enabled=getConfig().getBoolean("enabled",true);
    try {
      for(String folder:List.of("requests","decisions","results"))Files.createDirectories(root.resolve(folder));
      BufferedImage image=ImageIO.read(Objects.requireNonNull(getResource("ironman.png")));
      if(image.getWidth()!=64||image.getHeight()!=64)throw new IOException("Skin must be64x64");
      byte[] rgba=new byte[64*64*4];int i=0;
      for(int y=0;y<64;y++)for(int x=0;x<64;x++){int c=image.getRGB(x,y);rgba[i++]=(byte)(c>>16);rgba[i++]=(byte)(c>>8);rgba[i++]=(byte)c;rgba[i++]=(byte)(c>>24);}
      Skin skin=new Skin("dadeto-ironman-v1",rgba);
      GeyserApi.api().eventBus().subscribe(this,SessionSkinApplyEvent.class,event->{if(event.uuid().equals(npcId)||event.uuid().equals(PROFILE)){event.skin(skin);event.geometry(SkinGeometry.WIDE);skinPackets.incrementAndGet();}});
      getLogger().info("Iron Man custom64x64 skin hook ready");
      construction=new Construction(this,root);
      Bukkit.getPluginManager().registerEvents(this,this);Objects.requireNonNull(getCommand("ironman")).setExecutor(this);
      Bukkit.getScheduler().runTask(this,()->{
        try {cleanup();construction.recover();ready=true;}catch(Exception e){getLogger().log(java.util.logging.Level.SEVERE,"Construction recovery needs attention; journal retained",e);}
      });
      Bukkit.getScheduler().runTaskTimer(this,this::tick,2,2);
    }catch(Exception e){getLogger().log(java.util.logging.Level.SEVERE,"Iron Man did not enable",e);Bukkit.getPluginManager().disablePlugin(this);}
  }
  private void cleanup() {
    for(World world:Bukkit.getWorlds())for(Mannequin m:world.getEntitiesByClass(Mannequin.class))if(m.getPersistentDataContainer().has(marker,PersistentDataType.STRING))m.remove();
  }
  private Player owner() {return Bukkit.getPlayer(ownerId);}
  private void remove() {if(npc!=null)npc.remove();npc=null;npcId=null;}
  private Location clearPosition(Player p) {
    float yaw=p.getYaw();double a=Math.toRadians(yaw);
    for(double height:new double[]{1.2,2.5,0.2,4})for(double angle:new double[]{a,a+Math.PI/2,a-Math.PI/2,a+Math.PI}) {
      Location l=p.getLocation().add(Math.sin(angle)*3,height,-Math.cos(angle)*3);
      if(l.getBlockY()<p.getWorld().getMinHeight()||l.getBlockY()+1>=p.getWorld().getMaxHeight()||!p.getWorld().isChunkLoaded(l.getBlockX()>>4,l.getBlockZ()>>4))continue;
      Block feet=l.getBlock(),head=p.getWorld().getBlockAt(l.getBlockX(),l.getBlockY()+1,l.getBlockZ());
      if(feet.isPassable()&&!feet.isLiquid()&&head.isPassable()&&!head.isLiquid())return l;
    }
    return null;
  }
  private void ensure(Player p) {
    if(npc!=null && (npc.isDead()||!npc.isValid()))remove();
    Location target=clearPosition(p);
    if(target==null){remove();return;}
    if(npc==null) {
      npc=p.getWorld().spawn(target,Mannequin.class,entity->{
        entity.getPersistentDataContainer().set(marker,PersistentDataType.STRING,ownerId.toString());entity.setPersistent(false);entity.setRemoveWhenFarAway(false);entity.setInvulnerable(true);entity.setGravity(false);entity.setCollidable(false);entity.setSilent(true);entity.setImmovable(true);
        entity.customName(Component.text("Iron Man"));entity.setCustomNameVisible(true);entity.setDescription(Component.text("Your building assistant"));
        var profile=Bukkit.createProfile(PROFILE,"IronMan");
        String textures="{\"textures\":{\"SKIN\":{\"url\":\"https://textures.minecraft.net/texture/31f477eb1a7beee631c2ca64d06f8f68fa93a3386d04452ab27f43acdf1b60cb\"}}}";
        profile.setProperty(new ProfileProperty("textures",Base64.getEncoder().encodeToString(textures.getBytes(StandardCharsets.UTF_8))));entity.setProfile(ResolvableProfile.resolvableProfile(profile));
      });npcId=npc.getUniqueId();
    }
    double distance=npc.getWorld().equals(p.getWorld())?npc.getLocation().distance(p.getLocation()):Double.POSITIVE_INFINITY;
    if(distance>6 || !npc.getWorld().equals(p.getWorld()) || ticks%10==0)npc.teleport(target);
    if(!npc.getWorld().equals(p.getWorld()) || npc.getLocation().distanceSquared(p.getLocation())>256){remove();return;}
    maxObservedDistance=Math.max(maxObservedDistance,npc.getLocation().distance(p.getLocation()));
    Location face=p.getEyeLocation().subtract(npc.getEyeLocation());
    Location here=npc.getLocation();here.setDirection(face.toVector());npc.setRotation(here.getYaw(),here.getPitch());
    if(ticks%10==0) {
      if(mode.equals("scan")){Block b=p.getTargetBlockExact(12);if(b!=null)buildBeam(b.getWorld(),b.getX()+0.5,b.getY()+1.1,b.getZ()+0.5);}
      npc.getWorld().spawnParticle(Particle.SMALL_FLAME,npc.getLocation().add(0,0.05,0),3,0.15,0.05,0.15,0.01);
      npc.getWorld().spawnParticle(Particle.ELECTRIC_SPARK,npc.getLocation().add(0,1.2,0),1,0.02,0.02,0.02,0);
    }
  }
  void buildBeam(World world,double x,double y,double z) {
    if(npc==null||!npc.getWorld().equals(world))return;
    var start=npc.getEyeLocation().toVector();var end=new org.bukkit.util.Vector(x,y,z);
    for(int i=0;i<8;i++){var point=start.clone().add(end.clone().subtract(start).multiply(i/8.0));world.spawnParticle(Particle.END_ROD,point.getX(),point.getY(),point.getZ(),1,0,0,0,0);}
    npc.swingMainHand();
  }
  void followerCheck() {
    if(!Bukkit.getOnlinePlayers().isEmpty())throw new IllegalArgumentException("Follower check requires no connected players");
    double observed=maxObservedDistance;
    World tabletop=Bukkit.getWorlds().stream().filter(w->w.getKey().toString().equals("minecraft:dadeto_tabletop")).findFirst().orElseThrow();
    var position=new java.util.concurrent.atomic.AtomicReference<>(new Location(tabletop,144,84,4));
    Player fixture=(Player)java.lang.reflect.Proxy.newProxyInstance(Player.class.getClassLoader(),new Class<?>[]{Player.class},(proxy,method,args)->switch(method.getName()){
      case "getLocation"->position.get().clone();case "getEyeLocation"->position.get().clone().add(0,1.62,0);case "getWorld"->position.get().getWorld();case "getYaw"->position.get().getYaw();default->throw new UnsupportedOperationException(method.getName());});
    try {
      for(Location location:List.of(position.get().clone(),position.get().clone().add(0,20,0),Bukkit.getWorlds().getFirst().getSpawnLocation().add(0,8,0))) {
        position.set(location);location.getWorld().getChunkAt(location.getBlockX()>>4,location.getBlockZ()>>4);ensure(fixture);
        if(npc==null||!npc.getWorld().equals(location.getWorld())||npc.getLocation().distance(location)>16)throw new IllegalStateException("Native follower guard failed at "+location+"; entity="+(npc==null?"absent":npc.getLocation()));
      }
      Mannequin previous=npc;remove();if(previous.isValid()||npc!=null||npcId!=null)throw new IllegalStateException("Offline removal failed");
      getLogger().info("PASS IronMan native follower: spawn, 20-block owner teleport, world change, 16-block bound, offline removal");
    } finally {remove();maxObservedDistance=observed;}
  }
  private void tick() {
    ticks+=2;Player p=owner();
    if(!enabled||p==null||p.isDead()){remove();}else{ensure(p);if(ready)construction.tick(p,ticks);}
    if(ticks%20==0){context(p);if(ready)poll(p);}
  }
  private void context(Player p) {
    if(contextBusy)return;contextBusy=true;
    Map<String,Object> value=new LinkedHashMap<>();value.put("version",1);value.put("updatedAt",System.currentTimeMillis());value.put("ownerOnline",p!=null&&!p.isDead());value.put("enabled",enabled);value.put("owner",ownerId.toString());value.put("palette",BuildPlan.PALETTE);value.put("radius",16);value.put("maxBlocks",1024);value.put("mode",mode);value.put("skinPackets",skinPackets.get());value.put("maxObservedDistance",maxObservedDistance);
    value.put("construction",construction==null?"unavailable":construction.phase());value.put("progress",construction==null?0:construction.progress());value.put("total",construction==null?0:construction.total());
    if(p!=null){value.put("world",p.getWorld().getUID().toString());value.put("worldKey",p.getWorld().getKey().toString());value.put("position",List.of(p.getX(),p.getY(),p.getZ()));value.put("yaw",p.getYaw());Block b=p.getTargetBlockExact(12);if(b!=null)value.put("target",List.of(b.getX(),b.getY(),b.getZ(),b.getType().name()));}
    if(npc!=null){value.put("npc",npc.getUniqueId().toString());value.put("npcPosition",List.of(npc.getX(),npc.getY(),npc.getZ()));value.put("distance",p==null?-1:npc.getLocation().distance(p.getLocation()));}
    String data=BuildPlan.JSON.toJson(value);io(()->write("context.json",data),()->contextBusy=false);
  }
  private void poll(Player p) {
    if(polling)return;polling=true;
    disk.submit(()->{
      try {
        if(Files.exists(root.resolve("brain-status.json"))) {
          JsonObject status=read("brain-status.json",JsonObject.class);String message=status.has("message")?status.get("message").getAsString():"";
          if(!message.equals(lastBrainError)){lastBrainError=message;if(status.has("phase")&&status.get("phase").getAsString().equals("blocked"))Bukkit.getScheduler().runTask(this,()->{if(owner()!=null)owner().sendMessage("Iron Man brain: "+message);});}
        }
        try(DirectoryStream<Path> stream=Files.newDirectoryStream(root.resolve("decisions"),"*.json")) {
          Path file=null;for(Path entry:stream){file=entry;break;}
          if(file==null){Bukkit.getScheduler().runTask(this,()->polling=false);return;}
          String name=file.getFileName().toString();if(!name.matches("[a-z][a-z0-9-]{0,63}\\.json"))throw new IOException("Invalid decision filename");
          JsonObject envelope=read("decisions/"+name,JsonObject.class);Path selected=file;
          Bukkit.getScheduler().runTask(this,()->{try{apply(name.substring(0,name.length()-5),envelope);Files.deleteIfExists(selected);}catch(Exception e){result(name.substring(0,name.length()-5),"rejected",e.getMessage()==null?"Invalid decision":e.getMessage());try{Files.deleteIfExists(selected);}catch(IOException ignored){getLogger().warning("Decision file retained");}}finally{polling=false;}});
        }
      }catch(Exception e){getLogger().warning("Decision polling: "+e);if(!closing)Bukkit.getScheduler().runTask(this,()->polling=false);}
    });
  }
  private void apply(String id,JsonObject envelope) throws Exception {
    if(Files.exists(root.resolve("results/"+id+".json")))return;
    Player p=owner();if(p==null||p.isDead()||!enabled)throw new IllegalArgumentException("Owner is offline or companion disabled");
    BuildPlan.Decision decision=BuildPlan.parse(envelope.get("decision").toString());
    if(Set.of("build","preview").contains(decision.action())) {
      JsonObject request=read("requests/"+id+".json",JsonObject.class);
      if(!ownerId.toString().equals(request.get("owner").getAsString())||System.currentTimeMillis()-request.get("createdAt").getAsLong()>300000)throw new IllegalArgumentException("Request expired; point and ask again");
      construction.start(id,p,request,decision);result(id,"accepted","Preview/construction accepted");
    } else {mode=decision.action();result(id,"completed","Companion intent accepted");}
    if(!decision.speech().isBlank())p.sendMessage("Iron Man: "+decision.speech());
  }
  private void request(Player p,String mode,String prompt) throws IOException {
    if(!ready)throw new IllegalArgumentException("Builder is waiting for recovery; check the server log");
    if(prompt.isBlank()||prompt.length()>1000)throw new IllegalArgumentException("Use a building request up to1000 characters");
    if(construction.busy())throw new IllegalArgumentException("Finish, confirm or cancel the current blueprint first");
    Block target=p.getTargetBlockExact(12);Location origin;
    if(target==null){var direction=p.getLocation().getDirection().setY(0);if(direction.lengthSquared()<0.001){double a=Math.toRadians(p.getYaw());direction=new org.bukkit.util.Vector(-Math.sin(a),0,Math.cos(a));}origin=p.getLocation().add(direction.normalize().multiply(4));}else origin=target.getLocation().add(0,1,0);
    String id="build-"+UUID.randomUUID();JsonObject req=new JsonObject();req.addProperty("version",1);req.addProperty("id",id);req.addProperty("owner",ownerId.toString());req.addProperty("mode",mode);req.addProperty("prompt",prompt);req.addProperty("createdAt",System.currentTimeMillis());req.addProperty("world",p.getWorld().getUID().toString());req.add("origin",BuildPlan.JSON.toJsonTree(List.of(origin.getBlockX(),origin.getBlockY(),origin.getBlockZ())));req.add("ownerPosition",BuildPlan.JSON.toJsonTree(List.of(p.getX(),p.getY(),p.getZ())));
    String data=BuildPlan.JSON.toJson(req);io(()->write("requests/"+id+".json",data),()->p.sendMessage("Iron Man: planning your "+mode+" request with GPT-6-Luna. I will protect existing blocks."));
  }
  @Override public boolean onCommand(CommandSender sender,Command command,String label,String[] args) {
    Player p=sender instanceof Player?(Player)sender:null;
    if(p!=null&&!p.getUniqueId().equals(ownerId)&&!p.isOp()){sender.sendMessage("Iron Man follows his assigned building partner.");return true;}
    String action=args.length==0?"status":args[0].toLowerCase(Locale.ROOT);
    try {
      switch(action) {
        case "build","preview","revise"->{if(p==null)throw new IllegalArgumentException("A player must point at the worksite");request(p,action,String.join(" ",Arrays.copyOfRange(args,1,args.length)));}
        case "confirm"->construction.confirm();
        case "cancel"->{if(construction.busy())construction.cancel();try(DirectoryStream<Path> paths=Files.newDirectoryStream(root.resolve("requests"),"*.json")){for(Path path:paths)Files.delete(path);}sender.sendMessage("Iron Man: pending requests cancelled; completed edits will be restored if needed.");}
        case "undo"->{if(p==null)throw new IllegalArgumentException("Return to the worksite in game to undo");construction.undo(p);}
        case "on","off"->{enabled=action.equals("on");getConfig().set("enabled",enabled);saveConfig();if(!enabled)remove();sender.sendMessage("Iron Man "+(enabled?"enabled":"parked"));}
        case "follow"->{mode="follow";enabled=true;sender.sendMessage("Iron Man: staying near you.");}
        case "selftest"->{if(p!=null&&!p.isOp())throw new IllegalArgumentException("DM control");BuildPlanCheck.main(new String[0]);followerCheck();ConstructionCheck.run(this);sender.sendMessage("Iron Man integration check started; see server log for terminal result.");}
        default->sender.sendMessage("Iron Man: "+(enabled?"enabled":"parked")+"; "+(construction==null?"not ready":construction.phase())+"; skin deliveries "+skinPackets.get()+". /ironman build <request> | preview | confirm | cancel | undo");
      }
    }catch(Exception e){sender.sendMessage("Iron Man: "+e.getMessage());}
    return true;
  }
  @EventHandler public void onQuit(PlayerQuitEvent event){if(event.getPlayer().getUniqueId().equals(ownerId))remove();}
  @EventHandler public void onTeleport(PlayerTeleportEvent event){if(event.getPlayer().getUniqueId().equals(ownerId))Bukkit.getScheduler().runTask(this,()->{Player p=owner();if(p!=null&&enabled)ensure(p);});}
  @Override public void onDisable(){closing=true;remove();try{GeyserApi.api().eventBus().unregisterAll(this);}catch(Exception ignored){}disk.shutdown();try{disk.awaitTermination(10,TimeUnit.SECONDS);}catch(InterruptedException e){Thread.currentThread().interrupt();}}
}
