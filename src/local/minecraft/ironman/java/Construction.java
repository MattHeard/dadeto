package net.mattheard.ironman;

import com.google.gson.*;
import java.nio.file.*;
import java.util.*;
import org.bukkit.*;
import org.bukkit.entity.Player;

/** Journaled building, scoped to loaded nearby cells and an explicit owner request. */
final class Construction {
  record Position(int x,int y,int z) {
    String key() {return x+","+y+","+z;}
    static Position parse(String value) {String[] a=value.split(",");if(a.length!=3)throw new IllegalArgumentException("Invalid saved cell");return new Position(Integer.parseInt(a[0]),Integer.parseInt(a[1]),Integer.parseInt(a[2]));}
  }
  static final class State {String lastJob="";Map<String,String> owned=new LinkedHashMap<>();}
  record Journal(String id,String world,Map<String,String> before,Map<String,String> after,State oldState,State newState) {}
  private final IronManPlugin plugin;
  private final Path root;
  private State state=new State();
  private Journal job;
  private List<String> cells=List.of();
  private World world;
  private int cursor;
  private String phase="ready";
  private long previewUntil;
  private boolean rollback;
  private boolean previewOnly;
  private boolean recovering;
  private final Map<String,org.bukkit.block.data.BlockData> palette=new HashMap<>();
  Construction(IronManPlugin plugin,Path root) {this.plugin=plugin;this.root=root;}
  boolean busy() {return job!=null;}
  String phase() {return phase;}
  int progress() {return cursor;}
  int total() {return cells.size();}
  private State copy(State original) {return BuildPlan.JSON.fromJson(BuildPlan.JSON.toJson(original),State.class);}
  private String ownedKey(World w,String key) {return w.getUID()+":"+key;}
  void recover() throws Exception {
    if(Files.exists(root.resolve("build-state.json"))) state=plugin.readAt(root,"build-state.json",State.class);
    if(state==null || state.owned==null || state.owned.size()>16384) throw new IllegalArgumentException("Invalid build ownership state");
    if(!Files.exists(root.resolve("build-pending.json"))) return;
    Journal pending=plugin.readAt(root,"build-pending.json",Journal.class);
    validate(pending);
    if(state.lastJob.equals(pending.id())) {Files.delete(root.resolve("build-pending.json"));return;}
    world=Bukkit.getWorld(UUID.fromString(pending.world()));
    if(world==null) throw new IllegalStateException("Recovery world unavailable; journal retained");
    job=pending;cells=new ArrayList<>(job.before().keySet());rollback=true;recovering=true;phase="recovery waiting for owner near worksite";
  }
  private void validate(Journal journal) {
    if(journal==null || !journal.id().matches("[a-z][a-z0-9-]{0,63}") || journal.before().size()>1024 || !journal.before().keySet().equals(journal.after().keySet())) throw new IllegalArgumentException("Invalid build journal");
    for(String key:journal.before().keySet()) {
      Position.parse(key);
      for(String material:List.of(journal.before().get(key),journal.after().get(key))) {
        String base=material.replaceFirst("^minecraft:","").split("\\[",2)[0];
        if(!base.equals("air") && !BuildPlan.PALETTE.contains(base)) throw new IllegalArgumentException("Unsafe journal block");
        palette.computeIfAbsent(material,Bukkit::createBlockData);
      }
    }
  }
  void start(String id,Player owner,JsonObject request,BuildPlan.Decision decision) throws Exception {
    if(busy()) throw new IllegalStateException("A build is already in progress; cancel or finish it first");
    if(!owner.getWorld().getUID().toString().equals(request.get("world").getAsString())) throw new IllegalArgumentException("You changed worlds; point and ask again");
    JsonArray origin=request.getAsJsonArray("origin");int ox=origin.get(0).getAsInt(),oy=origin.get(1).getAsInt(),oz=origin.get(2).getAsInt();
    World target=owner.getWorld();Map<String,String> before=new LinkedHashMap<>(),after=new LinkedHashMap<>();State next=copy(state);next.lastJob=id;
    boolean revise=request.get("mode").getAsString().equals("revise");
    for(var cell:decision.blocks()) {
      Position p=new Position(ox+cell.x(),oy+cell.y(),oz+cell.z());
      if(p.y()<target.getMinHeight() || p.y()>=target.getMaxHeight() || !BuildPlan.within(p.x()+0.5,p.y()+0.5,p.z()+0.5,owner.getX(),owner.getY(),owner.getZ(),16)) throw new IllegalArgumentException("Blueprint extends beyond your nearby16-block work area");
      if(!target.isChunkLoaded(p.x()>>4,p.z()>>4)) throw new IllegalArgumentException("Worksite chunk is not loaded");
      String actual=target.getBlockAt(p.x(),p.y(),p.z()).getBlockData().getAsString();String key=ownedKey(target,p.key());
      if(!actual.equals("minecraft:air") && !(revise && actual.equals(state.owned.get(key)))) throw new IllegalArgumentException("Existing block protected; point at clear space or use revise for Iron Man's own blocks");
      String canonical=palette.computeIfAbsent(cell.material(),Bukkit::createBlockData).getAsString();
      before.put(p.key(),actual);after.put(p.key(),canonical);if(canonical.equals("minecraft:air"))next.owned.remove(key);else next.owned.put(key,canonical);
    }
    if(next.owned.size()>16384) throw new IllegalArgumentException("Builder ownership capacity reached; undo earlier builds first");
    Journal prepared=new Journal(id,target.getUID().toString(),before,after,copy(state),next);validate(prepared);world=target;job=prepared;cursor=0;rollback=false;previewOnly=request.get("mode").getAsString().equals("preview") || decision.action().equals("preview");
    cells=new ArrayList<>(before.keySet());phase="saving preview";
    String saved=BuildPlan.JSON.toJson(job);
    plugin.io(()->plugin.writeAt(root,"build-pending.json",saved),()->{phase="preview";previewUntil=System.currentTimeMillis()+2000;owner.sendMessage("Iron Man: hologram ready ("+cells.size()+" blocks). "+(previewOnly?"Use /ironman confirm to construct it.":"Starting in2 seconds; /ironman cancel stops it."));});
  }
  void confirm() {if(job==null || !phase.equals("preview")) throw new IllegalArgumentException("No preview is ready");previewOnly=false;previewUntil=0;}
  void cancel() {
    if(job==null) throw new IllegalArgumentException("No active construction");
    if(phase.equals("saving preview") || phase.equals("committing")) throw new IllegalArgumentException("Finishing a safe save; try again shortly");
    rollback=true;cursor=0;phase="rolling back";previewOnly=false;
  }
  void undo(Player owner) throws Exception {
    if(busy()) throw new IllegalArgumentException("Cancel the active build before undoing");
    Journal previous=plugin.readAt(root,"build-last.json",Journal.class);validate(previous);
    if(!previous.id().equals(state.lastJob)) throw new IllegalArgumentException("No matching last build to undo");
    world=Bukkit.getWorld(UUID.fromString(previous.world()));
    if(world==null || !world.equals(owner.getWorld())) throw new IllegalArgumentException("Return to that worksite's world to undo");
    for(var e:previous.after().entrySet()) {
      Position p=Position.parse(e.getKey());requireNearby(owner,p);
      if(!actual(p).equals(e.getValue())) throw new IllegalArgumentException("A block changed since construction; undo will not erase that change");
    }
    State target=copy(previous.oldState());String id="undo-"+UUID.randomUUID();target.lastJob=id;
    job=new Journal(id,previous.world(),previous.after(),previous.before(),copy(state),target);validate(job);cursor=0;rollback=false;recovering=false;cells=new ArrayList<>(job.before().keySet());phase="saving preview";
    plugin.io(()->plugin.writeAt(root,"build-pending.json",BuildPlan.JSON.toJson(job)),()->{phase="building";owner.sendMessage("Iron Man: undoing the last construction.");});
  }
  private void requireNearby(Player owner,Position p) {
    if(!world.equals(owner.getWorld()) || !world.isChunkLoaded(p.x()>>4,p.z()>>4) || !BuildPlan.within(p.x()+0.5,p.y()+0.5,p.z()+0.5,owner.getX(),owner.getY(),owner.getZ(),16)) throw new IllegalArgumentException("Return near the worksite to continue");
  }
  private String actual(Position p) {return world.getBlockAt(p.x(),p.y(),p.z()).getBlockData().getAsString();}
  void tick(Player owner,long tick) {
    if(job==null || owner==null || owner.isDead() || phase.equals("saving preview") || phase.equals("committing") || phase.startsWith("failed")) return;
    if(phase.equals("preview")) {
      if(tick%10==0) for(int i=0;i<cells.size();i+=Math.max(1,cells.size()/32)) {
        Position p=Position.parse(cells.get(i));
        if(world.equals(owner.getWorld())) world.spawnParticle(Particle.DUST,p.x()+0.5,p.y()+0.5,p.z()+0.5,1,new Particle.DustOptions(Color.AQUA,0.7f));
      }
      if(previewOnly || System.currentTimeMillis()<previewUntil) return;
      phase="building";
    }
    try {
      long stop=System.nanoTime()+2_000_000;int count=0;
      while(cursor<cells.size() && count++<20 && System.nanoTime()<stop) {
        Position p=Position.parse(cells.get(cursor));
        try {requireNearby(owner,p);} catch(IllegalArgumentException e) {phase=rollback?"rollback paused; return to worksite":"build paused; return to worksite";return;}
        String current=actual(p),old=job.before().get(p.key()),next=job.after().get(p.key());
        if(!current.equals(old) && !current.equals(next)) throw new IllegalArgumentException("External block change; journal retained at "+p.key());
        if(!(rollback?old:next).equals("minecraft:air")) {
          var volume=new org.bukkit.util.BoundingBox(p.x(),p.y(),p.z(),p.x()+1,p.y()+1,p.z()+1);
          if(world.getPlayers().stream().anyMatch(player->volume.overlaps(player.getBoundingBox()))){phase="waiting for players to clear the blueprint";return;}
        }
        world.getBlockAt(p.x(),p.y(),p.z()).setBlockData(palette.get(rollback?old:next),false);cursor++;
        if(tick%5==0 && count==1) plugin.buildBeam(world,p.x()+0.5,p.y()+0.5,p.z()+0.5);
      }
      if(tick%10==0) owner.sendActionBar(net.kyori.adventure.text.Component.text("Iron Man: "+cursor+"/"+cells.size()+" blocks"));
      if(cursor==cells.size()) finish(owner);
    } catch(Exception e) {phase="failed: "+e.getMessage();plugin.getLogger().warning(phase);owner.sendMessage("Iron Man: construction stopped safely; recovery journal retained. "+e.getMessage());}
  }
  private void finish(Player owner) {
    phase="committing";Journal finished=job;boolean cancelled=rollback;State next=cancelled?finished.oldState():finished.newState();
    world.save();String data=BuildPlan.JSON.toJson(next),history=BuildPlan.JSON.toJson(finished);
    plugin.io(()->{if(!cancelled)plugin.writeAt(root,"build-last.json",history);plugin.writeAt(root,"build-state.json",data);Files.delete(root.resolve("build-pending.json"));},()->{state=next;job=null;phase="ready";recovering=false;plugin.result(finished.id(),cancelled?"cancelled":"completed",cancelled?"Edits restored":"Construction complete");owner.sendMessage(cancelled?"Iron Man: cancelled; completed edits restored.":"Iron Man: construction complete. /ironman undo can restore the previous blocks.");});
  }
}
