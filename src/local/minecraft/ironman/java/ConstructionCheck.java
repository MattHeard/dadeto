package net.mattheard.ironman;

import com.google.gson.JsonObject;
import java.lang.reflect.Proxy;
import java.nio.file.*;
import java.util.*;
import org.bukkit.*;
import org.bukkit.entity.Player;
import org.bukkit.scheduler.BukkitRunnable;

/** Opt-in offline integration check, isolated from owner construction and scene state. */
final class ConstructionCheck {
  static void run(IronManPlugin plugin) throws Exception {
    if(!Bukkit.getOnlinePlayers().isEmpty())throw new IllegalArgumentException("Integration check requires no connected players");
    World world=Bukkit.getWorlds().stream().filter(w->w.getKey().toString().equals("minecraft:dadeto_tabletop")).findFirst().orElseThrow();
    int x=148,y=84,z=4;world.getChunkAt(x>>4,z>>4);
    for(int dx=0;dx<3;dx++)for(int dy=0;dy<3;dy++)if(!world.getBlockAt(x+dx,y+dy,z).getType().isAir())throw new IllegalArgumentException("Integration worksite occupied; preserving it");
    Path root=plugin.getDataFolder().toPath().resolve("selftest");Files.createDirectories(root);
    if(Files.exists(root.resolve("build-pending.json")))throw new IllegalArgumentException("Previous integration journal needs review");
    Player owner=(Player)Proxy.newProxyInstance(Player.class.getClassLoader(),new Class<?>[]{Player.class},(p,m,a)->switch(m.getName()){
      case "getWorld"->world;case "getX"->144.0;case "getY"->84.0;case "getZ"->4.0;case "isDead"->false;case "sendMessage","sendActionBar"->null;case "toString"->"IronManIntegrationOwner";default->throw new UnsupportedOperationException(m.getName());});
    JsonObject request=new JsonObject();request.addProperty("world",world.getUID().toString());request.addProperty("mode","preview");request.add("origin",BuildPlan.JSON.toJsonTree(List.of(x,y,z)));
    var decision=BuildPlan.parse("{\"action\":\"build\",\"speech\":\"\",\"reason\":\"integration\",\"boxes\":[{\"from\":[0,0,0],\"to\":[2,2,0],\"material\":\"oak_planks\"}]}");
    Construction engine=new Construction(plugin,root);engine.recover();engine.start("test-"+UUID.randomUUID(),owner,request,decision);
    new BukkitRunnable(){int ticks,stage;Construction current=engine;
      public void run(){try{
        ticks+=2;if(ticks>1200)throw new IllegalStateException("Integration timeout: "+current.phase());
        if(stage==0&&current.phase().equals("preview")){if(!world.getBlockAt(x,y,z).getType().isAir())throw new IllegalStateException("Preview changed blocks");current.confirm();stage=1;}
        current.tick(owner,ticks);
        if(stage==1&&!current.busy()){
          for(int dx=0;dx<3;dx++)for(int dy=0;dy<3;dy++)if(world.getBlockAt(x+dx,y+dy,z).getType()!=Material.OAK_PLANKS)throw new IllegalStateException("Build missing cell");
          try{current.start("protected-test",owner,request,decision);throw new IllegalStateException("Existing blocks overwritten");}catch(IllegalArgumentException expected){}
          current.undo(owner);stage=2;
        }else if(stage==2&&!current.busy()){
          for(int dx=0;dx<3;dx++)for(int dy=0;dy<3;dy++)if(!world.getBlockAt(x+dx,y+dy,z).getType().isAir())throw new IllegalStateException("Undo failed");
          current.start("recovery-"+UUID.randomUUID(),owner,request,decision);stage=3;
        }else if(stage==3&&current.phase().equals("preview")){
          current=new Construction(plugin,root);current.recover();stage=4;
        }else if(stage==4&&!current.busy()){
          if(!world.getBlockAt(x,y,z).getType().isAir()||Files.exists(root.resolve("build-pending.json")))throw new IllegalStateException("Recovery failed");
          plugin.getLogger().info("PASS IronMan integration: preview, nine-block build, existing-block protection, undo, journal recovery; worksite restored");cancel();
        }
      }catch(Exception error){plugin.getLogger().log(java.util.logging.Level.SEVERE,"IronMan integration FAILED; journal retained",error);cancel();}}
    }.runTaskTimer(plugin,2,2);
  }
}
