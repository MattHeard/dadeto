package net.mattheard.tabletop;

import com.google.gson.*;
import java.util.*;

/** Bounded declarative interactions: counters, preconditions, material changes and provenance-preserving copies. */
final class SceneRules {
  record Effect(String source, String target, String material, List<Integer> offset, String title, String explanation, String kind) {}
  record Rule(String id, String trigger, String label, Map<String,Integer> requires, Map<String,Integer> increments, List<Effect> effects, String message) {}
  record Topic(String kind, String text, Map<String,Integer> requires) {}
  record Guide(String object, String role, String disclaimer, Map<String,Topic> topics) {}

  static Map<String,Integer> numbers(JsonObject root, String key) {
    Map<String,Integer> values = new LinkedHashMap<>();
    if (!root.has(key)) return values;
    JsonObject map = root.getAsJsonObject(key);
    if (map.size() > 128) throw new IllegalArgumentException("At most 128 counter entries");
    for (var entry : map.entrySet()) {
      if (!entry.getKey().matches("[a-z][a-z0-9-]{0,63}")) throw new IllegalArgumentException("Invalid counter ID");
      int number = SceneModel.integer(entry.getValue());
      if (Math.abs((long)number) > 1_000_000) throw new IllegalArgumentException("Counter magnitude exceeds limit");
      values.put(entry.getKey(), number);
    }
    return values;
  }
  static Rule rule(JsonObject input) {
    List<Effect> effects = new ArrayList<>();
    JsonArray list = input.has("effects") ? input.getAsJsonArray("effects") : new JsonArray();
    if (list.size() > 16) throw new IllegalArgumentException("At most sixteen effects per action");
    Set<String> targets = new HashSet<>();
    for (var value : list) {
      JsonObject effect = value.getAsJsonObject();
      String source = SceneModel.id(effect, "source"), target = SceneModel.id(effect, "target");
      if (!targets.add(target)) throw new IllegalArgumentException("Duplicate effect target");
      String material = effect.has("material") ? SceneModel.text(effect,"material",40) : null;
      if (material != null && !SceneModel.MATERIALS.contains(material)) throw new IllegalArgumentException("Unsafe effect material");
      JsonArray offset = effect.getAsJsonArray("offset");
      if (offset == null || offset.size()!=3) throw new IllegalArgumentException("Effect offset needs three integers");
      List<Integer> delta = new ArrayList<>();
      for (var n : offset) { int d=SceneModel.integer(n); if (Math.abs((long)d)>128) throw new IllegalArgumentException("Offset too large"); delta.add(d); }
      String kind = SceneModel.text(effect,"kind",30);
      if (!SceneModel.KINDS.contains(kind)) throw new IllegalArgumentException("Invalid effect epistemic category");
      effects.add(new Effect(source,target,material,delta,SceneModel.text(effect,"title",100),SceneModel.text(effect,"explanation",1200),kind));
    }
    return new Rule(SceneModel.id(input,"id"),SceneModel.id(input,"trigger"),SceneModel.text(input,"label",100),numbers(input,"requires"),numbers(input,"increments"),effects,SceneModel.text(input,"message",1200));
  }
  static Guide guide(JsonObject input) {
    Map<String,Topic> topics = new LinkedHashMap<>();
    JsonObject supplied = input.getAsJsonObject("topics");
    if (supplied == null || supplied.size()>32) throw new IllegalArgumentException("At most 32 guide topics");
    for (var entry : supplied.entrySet()) {
      if (!entry.getKey().matches("[a-z][a-z0-9-]{0,63}")) throw new IllegalArgumentException("Invalid topic ID");
      JsonObject topic=entry.getValue().getAsJsonObject();
      String kind=SceneModel.text(topic,"kind",30);
      if (!SceneModel.KINDS.contains(kind)) throw new IllegalArgumentException("Invalid topic epistemic category");
      topics.put(entry.getKey(),new Topic(kind,SceneModel.text(topic,"text",1200),numbers(topic,"requires")));
    }
    return new Guide(SceneModel.id(input,"object"),SceneModel.text(input,"role",100),SceneModel.text(input,"disclaimer",500),topics);
  }
  static void check(SceneModel.State state) {
    if (state.variables==null || state.rules==null || state.guides==null || state.provenance==null || state.variables.size()>128 || state.rules.size()>128 || state.guides.size()>16) throw new IllegalArgumentException("Invalid interaction state");
    for (var n:state.variables.values()) if (n==null || n<0 || n>1_000_000) throw new IllegalArgumentException("Counter outside 0..1000000");
    for (var rule:state.rules.values()) {
      if (!state.objects.containsKey(rule.trigger()) || rule.effects().size()>16) throw new IllegalArgumentException("Rule needs an existing trigger object");
      for (String key:rule.requires().keySet()) if (!state.variables.containsKey(key)) throw new IllegalArgumentException("Unknown prerequisite counter: "+key);
      for (String key:rule.increments().keySet()) if (!state.variables.containsKey(key)) throw new IllegalArgumentException("Unknown changed counter: "+key);
      int expanded=0;
      for (var e:rule.effects()) {
        if (!state.objects.containsKey(e.source())) throw new IllegalArgumentException("Missing effect source: "+e.source());
        expanded+=state.objects.get(e.source()).blocks().size();
      }
      if(expanded>4096) throw new IllegalArgumentException("Action exceeds 4096 effect cells");
    }
    for (var guide:state.guides.values()) {
      if (!state.objects.containsKey(guide.object()) || guide.topics().size()>32) throw new IllegalArgumentException("Guide needs an existing object");
      for (var topic:guide.topics().values()) for (String key:topic.requires().keySet()) if (!state.variables.containsKey(key)) throw new IllegalArgumentException("Unknown topic prerequisite");
    }
  }
  static boolean available(SceneModel.State state, Map<String,Integer> requires) {
    return requires.entrySet().stream().allMatch(e -> Objects.equals(state.variables.get(e.getKey()),e.getValue()));
  }
  static String explain(SceneModel.State state,String template) {
    String result=template;
    for (var value:state.variables.entrySet()) result=result.replace("{"+value.getKey()+"}",Integer.toString(value.getValue()));
    return result;
  }
  private static void configure(SceneModel.State after,JsonObject config) {
        if(config==null) throw new IllegalArgumentException("Missing interaction configuration");
        after.variables.putAll(numbers(config,"variables"));
        if(config.has("rules")) {
          if(config.getAsJsonArray("rules").size()>128) throw new IllegalArgumentException("Too many rules");
          for(var value:config.getAsJsonArray("rules")) { Rule r=rule(value.getAsJsonObject()); after.rules.put(r.id(),r); }
        }
        if(config.has("guides")) {
          if(config.getAsJsonArray("guides").size()>16) throw new IllegalArgumentException("Too many guides");
          for(var value:config.getAsJsonArray("guides")) { Guide g=guide(value.getAsJsonObject()); after.guides.put(g.object(),g); }
        }
  }
  static SceneModel.State next(SceneModel.State state, SceneModel.Request request) {
    SceneModel.State after=SceneModel.copy(state);
    switch(request.action()) {
      case "configure" -> {
        configure(after,request.payload().getAsJsonObject("configuration"));
      }
      case "batch" -> {
        JsonArray objects=request.payload().getAsJsonArray("objects");
        if(objects==null || objects.isEmpty() || objects.size()>32) throw new IllegalArgumentException("Batch needs 1..32 objects");
        Set<String> ids=new HashSet<>();
        int expanded=0;
        for(var object:objects) {
          JsonObject single=new JsonObject(); single.addProperty("version",1); single.addProperty("id",request.id()); single.addProperty("revision",state.revision); single.addProperty("action","put"); single.add("object",object);
          SceneModel.ObjectSpec o=SceneModel.parse(single.toString()).object();
          expanded+=o.blocks().size();
          if(expanded>4096) throw new IllegalArgumentException("Batch exceeds 4096 expanded cells");
          if(!ids.add(o.id())) throw new IllegalArgumentException("Duplicate batch object");
          after.objects.put(o.id(),o);
        }
        if(request.payload().has("configuration")) configure(after,request.payload().getAsJsonObject("configuration"));
      }
      case "act" -> {
        String id=SceneModel.id(request.payload(),"rule");
        Rule rule=state.rules.get(id);
        if(rule==null || !available(state,rule.requires())) throw new IllegalArgumentException("Action is no longer available; inspect the object again");
        for(var entry:rule.increments().entrySet()) {
          Integer old=after.variables.get(entry.getKey());
          if(old==null) throw new IllegalArgumentException("Missing action counter");
          after.variables.put(entry.getKey(),Math.addExact(old,entry.getValue()));
        }
        for(Effect effect:rule.effects()) {
          SceneModel.ObjectSpec source=state.objects.get(effect.source());
          if(source==null) throw new IllegalArgumentException("Missing action source");
          Map<String,String> blocks=new LinkedHashMap<>();
          for(var block:source.blocks().entrySet()) {
            SceneModel.Cell c=SceneModel.Cell.parse(block.getKey());
            SceneModel.Cell moved=new SceneModel.Cell(c.x()+effect.offset().get(0),c.y()+effect.offset().get(1),c.z()+effect.offset().get(2)); moved.check();
            blocks.put(moved.key(),effect.material()==null?block.getValue():"minecraft:"+effect.material());
          }
          List<String> links=effect.source().equals(effect.target())?source.relatesTo():List.of(effect.source());
          after.objects.put(effect.target(),new SceneModel.ObjectSpec(effect.target(),effect.title(),effect.explanation(),effect.kind(),links,blocks));
          if(!effect.source().equals(effect.target())) after.provenance.put(effect.target(),state.provenance.getOrDefault(effect.source(),effect.source()));
        }
        after.lastActor=request.payload().has("actor")?SceneModel.text(request.payload(),"actor",100):"operator";
      }
      default -> throw new IllegalArgumentException("Unsupported scene action");
    }
    after.revision++; after.lastJob=request.id();
    SceneModel.check(after);
    for(var object:after.objects.values()) for(String link:object.relatesTo()) if(!after.objects.containsKey(link)) throw new IllegalArgumentException("Unknown related object: "+link);
    return after;
  }
}
