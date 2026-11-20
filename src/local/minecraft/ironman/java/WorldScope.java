package net.mattheard.ironman;

import java.util.*;

/** Vanilla survival and the hub remain free of companion effects and model requests. */
final class WorldScope {
  static final List<String> DEFAULT=List.of("minecraft:dadeto_build","minecraft:dadeto_tabletop");
  static boolean allowed(String world,Collection<String> worlds){return worlds.contains(world);}
  static void check(){
    for(String world:List.of("minecraft:overworld","minecraft:the_nether","minecraft:the_end","minecraft:dadeto_hub"))if(allowed(world,DEFAULT))throw new AssertionError("Companion leaked into vanilla/hub");
    for(String world:DEFAULT)if(!allowed(world,DEFAULT))throw new AssertionError("Workshop companion unavailable");
  }
}
