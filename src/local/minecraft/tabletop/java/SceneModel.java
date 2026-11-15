package net.mattheard.tabletop;

import com.google.gson.*;
import java.util.*;

/** Server-independent, bounded scene protocol. No commands, NBT, scripts or topic templates. */
final class SceneModel {
  static final Gson JSON = new GsonBuilder().setPrettyPrinting().create();
  static final int LIMIT = 4096;
  static final Set<String> KINDS = Set.of("metaphor", "assumption", "simulation", "historical-claim", "speculation");
  static final Set<String> MATERIALS = Set.of("air", "stone", "stone_bricks", "smooth_stone", "oak_planks", "spruce_planks", "birch_planks", "dark_oak_planks", "white_concrete", "black_concrete", "red_concrete", "blue_concrete", "green_concrete", "yellow_concrete", "orange_concrete", "purple_concrete", "light_blue_concrete", "gray_concrete", "glass", "sea_lantern", "sandstone", "quartz_block", "gold_block", "iron_block", "waxed_copper_block", "packed_ice");
  record Cell(int x, int y, int z) {
    String key() { return x + "," + y + "," + z; }
    static Cell parse(String key) {
      String[] parts = key.split(",", -1);
      if (parts.length != 3) throw new IllegalArgumentException("Invalid cell");
      Cell cell = new Cell(Integer.parseInt(parts[0]), Integer.parseInt(parts[1]), Integer.parseInt(parts[2]));
      cell.check(); return cell;
    }
    void check() {
      if (x < 96 || x > 159 || z < 0 || z > 63 || y < 64 || y > 95)
        throw new IllegalArgumentException("Outside lab bounds: " + key());
    }
  }
  static String text(JsonObject root, String key, int max) {
    JsonElement value = root.get(key);
    if (value == null || !value.isJsonPrimitive() || !value.getAsJsonPrimitive().isString()) throw new IllegalArgumentException("Missing text: " + key);
    String result = value.getAsString();
    if (result.isBlank() || result.length() > max || result.chars().anyMatch(c -> c < 32 || c == 167)) throw new IllegalArgumentException("Invalid text: " + key);
    return result;
  }
  static String id(JsonObject root, String key) {
    String value = text(root, key, 64);
    if (!value.matches("[a-z][a-z0-9-]{0,63}")) throw new IllegalArgumentException("Invalid ID: " + key);
    return value;
  }
  static int integer(JsonElement value) {
    if (value == null || !value.isJsonPrimitive() || !value.getAsJsonPrimitive().isNumber() || !value.getAsString().matches("-?[0-9]{1,9}")) throw new IllegalArgumentException("Expected integer");
    return value.getAsInt();
  }
  static int[] point(JsonElement value) {
    if (value == null || !value.isJsonArray() || value.getAsJsonArray().size() != 3) throw new IllegalArgumentException("Expected [x,y,z]");
    JsonArray a = value.getAsJsonArray();
    int[] p = {integer(a.get(0)), integer(a.get(1)), integer(a.get(2))};
    new Cell(p[0], p[1], p[2]).check(); return p;
  }
  record ObjectSpec(String id, String title, String explanation, String kind, List<String> relatesTo, Map<String, String> blocks) {}
  record Request(String id, int revision, String action, ObjectSpec object) {}
  static Request parse(String input) {
    if (input.length() > 65536) throw new IllegalArgumentException("Request exceeds 64 KiB");
    JsonObject root = JsonParser.parseString(input).getAsJsonObject();
    if (integer(root.get("version")) != 1) throw new IllegalArgumentException("Unsupported protocol version");
    String id = id(root, "id"), action = text(root, "action", 10);
    int revision = integer(root.get("revision"));
    if (revision < 0) throw new IllegalArgumentException("Negative revision");
    if (action.equals("undo")) return new Request(id, revision, action, null);
    if (!action.equals("put")) throw new IllegalArgumentException("Use put or undo");
    JsonObject object = root.getAsJsonObject("object");
    String objectId = id(object, "id"), title = text(object, "title", 100), explanation = text(object, "explanation", 1200), kind = text(object, "kind", 30);
    if (!KINDS.contains(kind)) throw new IllegalArgumentException("Missing epistemic category");
    List<String> links = new ArrayList<>();
    if (object.has("relatesTo")) for (JsonElement link : object.getAsJsonArray("relatesTo")) {
      if (!link.isJsonPrimitive() || !link.getAsJsonPrimitive().isString() || !link.getAsString().matches("[a-z][a-z0-9-]{0,63}") || links.size() >= 16) throw new IllegalArgumentException("Invalid relationship");
      links.add(link.getAsString());
    }
    Map<String, String> blocks = new LinkedHashMap<>();
    JsonArray boxes = object.getAsJsonArray("boxes");
    if (boxes == null || boxes.size() > 128) throw new IllegalArgumentException("At most 128 boxes");
    int expanded = 0;
    for (JsonElement value : boxes) {
      JsonObject box = value.getAsJsonObject();
      int[] from = point(box.get("from")), to = point(box.get("to"));
      String material = text(box, "material", 40);
      if (!MATERIALS.contains(material)) throw new IllegalArgumentException("Unsupported safe material: " + material);
      for (int i = 0; i < 3; i++) if (from[i] > to[i]) throw new IllegalArgumentException("Inverted box");
      long volume = (long)(to[0]-from[0]+1)*(to[1]-from[1]+1)*(to[2]-from[2]+1);
      if (volume > LIMIT || expanded + volume > LIMIT) throw new IllegalArgumentException("At most 4096 expanded blocks");
      expanded += (int) volume;
      for (int x=from[0]; x<=to[0]; x++) for (int y=from[1]; y<=to[1]; y++) for (int z=from[2]; z<=to[2]; z++) {
        String key = new Cell(x,y,z).key();
        if (blocks.putIfAbsent(key, "minecraft:" + material) != null) throw new IllegalArgumentException("Overlapping boxes");
      }
    }
    return new Request(id, revision, action, new ObjectSpec(objectId, title, explanation, kind, links, blocks));
  }
  static final class State {
    int version = 1;
    int revision;
    String lastJob = "";
    Map<String, ObjectSpec> objects = new LinkedHashMap<>();
  }
  record Journal(String id, State before, State after, Map<String,String> oldBlocks, Map<String,String> newBlocks) {}
  static State copy(State state) { return JSON.fromJson(JSON.toJson(state), State.class); }
  static void check(State state) {
    if (state == null || state.version != 1 || state.revision < 0 || state.objects == null || state.objects.size() > 64) throw new IllegalArgumentException("Invalid saved scene state");
    Set<String> cells = new HashSet<>();
    for (var entry : state.objects.entrySet()) {
      ObjectSpec o = entry.getValue();
      if (o == null || !entry.getKey().equals(o.id()) || !KINDS.contains(o.kind()) || o.blocks() == null) throw new IllegalArgumentException("Invalid saved object");
      for (var b : o.blocks().entrySet()) {
        Cell.parse(b.getKey());
        if (!MATERIALS.contains(b.getValue().replaceFirst("^minecraft:", "")) || !cells.add(b.getKey())) throw new IllegalArgumentException("Invalid saved block ownership");
      }
      if (cells.size() > 8192) throw new IllegalArgumentException("Lab capacity: 8192 owned blocks");
    }
  }
  static State next(State state, Request request) {
    check(state);
    if (request.revision() != state.revision) throw new IllegalArgumentException("Stale revision; read context.json again");
    if (!request.action().equals("put")) throw new IllegalArgumentException("Undo requires a completed journal");
    State after = copy(state); after.revision++; after.lastJob = request.id();
    after.objects.put(request.object().id(), request.object());
    check(after);
    for (String link : request.object().relatesTo()) if (!after.objects.containsKey(link)) throw new IllegalArgumentException("Unknown related object: " + link);
    return after;
  }
}
