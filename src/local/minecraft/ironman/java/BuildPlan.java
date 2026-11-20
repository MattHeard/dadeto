package net.mattheard.ironman;

import com.google.gson.*;
import java.util.*;

/** Pure bounded blueprint parser: no commands, NBT, absolute coordinates or block entities. */
final class BuildPlan {
  static final Gson JSON = new GsonBuilder().setPrettyPrinting().create();
  static final Set<String> PALETTE = Set.of("air", "stone", "stone_bricks", "smooth_stone", "oak_planks", "spruce_planks", "birch_planks", "dark_oak_planks", "glass", "white_concrete", "black_concrete", "red_concrete", "blue_concrete", "green_concrete", "yellow_concrete", "orange_concrete", "light_blue_concrete", "gray_concrete", "sandstone", "quartz_block", "gold_block", "iron_block", "waxed_copper_block", "sea_lantern", "oak_stairs", "oak_slab", "stone_brick_stairs", "stone_brick_slab");
  record Cell(int x, int y, int z, String material) {}
  record Decision(String action,String speech,String reason,List<Cell> blocks) {}
  static String text(JsonObject o,String key,int limit) {
    var value=o.get(key);
    if(value==null || !value.isJsonPrimitive() || !value.getAsJsonPrimitive().isString()) throw new IllegalArgumentException("Missing text: "+key);
    String result=value.getAsString();
    if(result.length()>limit || result.chars().anyMatch(c->c<32 || c==167)) throw new IllegalArgumentException("Invalid text: "+key);
    return result;
  }
  static int number(JsonElement value) {
    if(value==null || !value.isJsonPrimitive() || !value.getAsJsonPrimitive().isNumber() || !value.getAsString().matches("-?[0-9]{1,3}")) throw new IllegalArgumentException("Expected bounded integer");
    int n=value.getAsInt(); if(n< -16 || n>16) throw new IllegalArgumentException("Blueprint offsets exceed16"); return n;
  }
  static int[] point(JsonElement value) {
    if(value==null || !value.isJsonArray() || value.getAsJsonArray().size()!=3) throw new IllegalArgumentException("Expected [x,y,z]");
    var a=value.getAsJsonArray(); return new int[]{number(a.get(0)),number(a.get(1)),number(a.get(2))};
  }
  static Decision parse(String input) {
    if(input.length()>65536) throw new IllegalArgumentException("Decision exceeds64KiB");
    JsonObject root=JsonParser.parseString(input).getAsJsonObject();
    String action=text(root,"action",20),speech=text(root,"speech",240),reason=text(root,"reason",400);
    if(!Set.of("follow","hover","scan","build","preview","idle").contains(action)) throw new IllegalArgumentException("Unknown action");
    JsonArray boxes=root.getAsJsonArray("boxes");
    if(boxes==null || boxes.size()>32) throw new IllegalArgumentException("At most32 boxes");
    Map<String,Cell> cells=new LinkedHashMap<>(); int expanded=0;
    for(var element:boxes) {
      JsonObject box=element.getAsJsonObject(); int[] from=point(box.get("from")),to=point(box.get("to"));
      String material=text(box,"material",80); String base=material.split("\\[",2)[0];
      if(!PALETTE.contains(base) || !material.matches("[a-z_]+(\\[[a-z_=,0-9]+\\])?")) throw new IllegalArgumentException("Unsafe material");
      for(int i=0;i<3;i++) if(from[i]>to[i]) throw new IllegalArgumentException("Inverted box");
      long volume=(long)(to[0]-from[0]+1)*(to[1]-from[1]+1)*(to[2]-from[2]+1);
      if(volume>1024 || expanded+volume>1024) throw new IllegalArgumentException("At most1024 expanded blocks"); expanded+=(int)volume;
      for(int x=from[0];x<=to[0];x++) for(int y=from[1];y<=to[1];y++) for(int z=from[2];z<=to[2];z++) {
        String key=x+","+y+","+z;
        if(cells.putIfAbsent(key,new Cell(x,y,z,"minecraft:"+material))!=null) throw new IllegalArgumentException("Overlapping boxes");
      }
    }
    if(!Set.of("build","preview").contains(action) && !cells.isEmpty()) throw new IllegalArgumentException("Only build/preview may contain blocks");
    if(Set.of("build","preview").contains(action) && cells.isEmpty()) throw new IllegalArgumentException("Empty blueprint");
    return new Decision(action,speech,reason,List.copyOf(cells.values()));
  }
  static boolean within(double x,double y,double z,double px,double py,double pz,double radius) {
    double dx=x-px,dy=y-py,dz=z-pz;return dx*dx+dy*dy+dz*dz<=radius*radius;
  }
}
