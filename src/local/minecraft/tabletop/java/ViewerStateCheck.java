package net.mattheard.tabletop;

import java.io.*;
import java.lang.reflect.Proxy;
import java.nio.file.Files;
import java.util.*;
import net.kyori.adventure.text.Component;
import org.bukkit.*;
import org.bukkit.entity.Player;
import org.bukkit.inventory.*;
import org.bukkit.inventory.meta.ItemMeta;

/** Runtime serialization check using a synthetic player; never mutates a real player. */
public final class ViewerStateCheck {
  private ViewerStateCheck() {}
  public static String run(File directory, World returnWorld) throws Exception {
    Files.createDirectories(directory.toPath());
    ItemStack[] contents = new ItemStack[41];
    contents[2] = new ItemStack(Material.DIAMOND, 7);
    ItemMeta meta = contents[2].getItemMeta();
    meta.displayName(Component.text("Tabletop snapshot fixture")); contents[2].setItemMeta(meta);
    contents[36] = new ItemStack(Material.DIAMOND_BOOTS);
    contents[40] = new ItemStack(Material.TORCH, 12);
    Map<String,Object> state = new HashMap<>();
    state.put("contents", contents); state.put("mode", GameMode.SURVIVAL);
    state.put("allow-flight", false); state.put("flying", false); state.put("gravity", true);
    state.put("held", 5); state.put("location", new Location(returnWorld, 9.5, 70, 12.5, 22, 9));
    state.put("saved", false);
    PlayerInventory inventory = (PlayerInventory) Proxy.newProxyInstance(PlayerInventory.class.getClassLoader(),
      new Class<?>[]{PlayerInventory.class}, (object, method, args) -> switch(method.getName()) {
        case "getContents" -> state.get("contents");
        case "setContents" -> { state.put("contents", args[0]); yield null; }
        case "getHeldItemSlot" -> state.get("held");
        case "setHeldItemSlot" -> { state.put("held", args[0]); yield null; }
        default -> throw new UnsupportedOperationException(method.getName());
      });
    Player player = (Player) Proxy.newProxyInstance(Player.class.getClassLoader(), new Class<?>[]{Player.class},
      (object, method, args) -> switch(method.getName()) {
        case "getInventory" -> inventory;
        case "getLocation" -> ((Location)state.get("location")).clone();
        case "getGameMode" -> state.get("mode");
        case "setGameMode" -> { state.put("mode", args[0]); yield null; }
        case "getAllowFlight" -> state.get("allow-flight");
        case "setAllowFlight" -> { state.put("allow-flight", args[0]); yield null; }
        case "isFlying" -> state.get("flying");
        case "setFlying" -> { state.put("flying", args[0]); yield null; }
        case "hasGravity" -> state.get("gravity");
        case "setGravity" -> { state.put("gravity", args[0]); yield null; }
        case "teleport" -> { state.put("location", ((Location)args[0]).clone()); yield true; }
        case "saveData" -> { state.put("saved", true); yield null; }
        default -> throw new UnsupportedOperationException(method.getName());
      });
    ViewerState snapshot = ViewerState.capture(player);
    snapshot.view = 4;
    contents[2].setAmount(1);
    File file = new File(directory, "return-state.yml"); snapshot.save(file);
    ViewerState loaded = ViewerState.load(file);
    state.put("contents", new ItemStack[41]); state.put("mode", GameMode.ADVENTURE);
    state.put("allow-flight", true); state.put("flying", true); state.put("gravity", false); state.put("held", 0);
    state.put("location", new Location(returnWorld, 0, 130, 0, 0, 90));
    loaded.restore(player);
    ItemStack[] restored = (ItemStack[])state.get("contents");
    require(restored[2].getAmount()==7 && restored[2].getItemMeta().displayName().equals(meta.displayName()), "named item copy");
    require(restored[36].getType()==Material.DIAMOND_BOOTS && restored[40].getAmount()==12, "armor and offhand");
    require(restored[0]==null && restored[10]==null && loaded.view==4, "empty slots and view persistence");
    require(state.get("mode")==GameMode.SURVIVAL && state.get("held").equals(5), "mode and selected slot");
    require(state.get("allow-flight").equals(false) && state.get("flying").equals(false)
      && state.get("gravity").equals(true) && state.get("saved").equals(true), "abilities and durable save");
    require(((Location)state.get("location")).equals(new Location(returnWorld,9.5,70,12.5,22,9)), "return position and orientation");
    File bad = new File(directory,"incomplete.yml"); Files.writeString(bad.toPath(),"mode: SURVIVAL\n");
    boolean rejected=false;
    try { ViewerState.load(bad); } catch(IOException expected) { rejected=true; }
    require(rejected && bad.exists(), "incomplete snapshots retained");
    Files.delete(file.toPath()); Files.delete(bad.toPath());
    File unknown = new File(directory, "unowned-world"); Files.createDirectories(unknown.toPath());
    boolean refused = false;
    try { TabletopPlugin.requireOwnedFolder(unknown); } catch (IOException expected) { refused = true; }
    require(refused, "unowned world rejection");
    File marker = new File(unknown, "dadeto-tabletop.marker");
    Files.writeString(marker.toPath(), "Dadeto noble house tabletop\n");
    TabletopPlugin.requireOwnedFolder(unknown);
    Files.delete(marker.toPath()); Files.delete(unknown.toPath());
    return "PASS: named inventory/armor/offhand/null slots, mode/slot/flight/gravity/location, atomic snapshot reload, durable player save, incomplete-state and unowned-world rejection";
  }
  private static void require(boolean condition, String label) {
    if (!condition) throw new IllegalStateException("Viewer snapshot check failed: "+label);
  }
}
