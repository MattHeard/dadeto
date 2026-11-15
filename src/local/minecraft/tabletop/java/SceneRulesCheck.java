package net.mattheard.tabletop;

import com.google.gson.*;
import java.util.*;

/** Characterizes atomic interventions, pre-state copying, guide conditions and backward-compatible persistence. */
final class SceneRulesCheck {
  private static void require(boolean value,String message) { if(!value) throw new AssertionError(message); }
  private static void rejects(Runnable run) { try {run.run();} catch(IllegalArgumentException|IllegalStateException e) {return;} throw new AssertionError("Unsafe interaction accepted"); }
  private static final String CONFIG="""
    {"version":1,"id":"configure-check","revision":1,"action":"configure","configuration":{
    "variables":{"count":0,"done":0},"rules":[{"id":"replace","trigger":"idea","label":"Replace component","requires":{"done":0},"increments":{"done":1,"count":1},"message":"Replaced {count}","effects":[
    {"source":"idea","target":"idea","offset":[0,0,0],"material":"spruce_planks","title":"Replacement","explanation":"A replacement part","kind":"assumption"},
    {"source":"idea","target":"original","offset":[0,0,8],"title":"Original","explanation":"Original material reconstructed nearby","kind":"metaphor"}]}],
    "guides":[{"object":"idea","role":"A hypothetical interpreter","disclaimer":"An interpretation, not a historical quotation","topics":{"compare":{"kind":"speculation","text":"{count} component replaced; continuity and material criteria may disagree","requires":{"count":1}}}}]}}
    """;
  static String run() {
    SceneModel.State base=SceneModel.next(new SceneModel.State(),SceneModel.parse(SceneModelCheck.VALID));
    SceneModel.State configured=SceneModel.next(base,SceneModel.parse(CONFIG));
    require(configured.revision==2 && configured.rules.size()==1,"Configuration did not persist");
    var action=SceneModel.parse("{\"version\":1,\"id\":\"act-check\",\"revision\":2,\"action\":\"act\",\"rule\":\"replace\",\"actor\":\"synthetic-test\"}");
    SceneModel.State result=SceneModel.next(configured,action);
    require(result.variables.get("count")==1 && result.variables.get("done")==1,"Counters not atomic");
    require(result.objects.get("idea").blocks().values().stream().allMatch(m->m.equals("minecraft:spruce_planks")),"Replacement material incorrect");
    require(result.objects.get("original").blocks().values().stream().allMatch(m->m.equals("minecraft:oak_planks")),"Copy must use pre-action originals regardless of effect order");
    require(result.provenance.get("original").equals("idea"),"Original provenance lost");
    require(configured.variables.get("count")==0 && configured.objects.size()==1,"Input state mutated");
    require(SceneRules.explain(result,result.rules.get("replace").message()).equals("Replaced 1"),"Progress explanation incorrect");
    require(!SceneRules.available(configured,configured.guides.get("idea").topics().get("compare").requires()),"Premature guide topic available");
    require(SceneRules.available(result,result.guides.get("idea").topics().get("compare").requires()),"Guide cannot discuss resulting state");
    SceneModel.State loaded=SceneModel.copy(result); SceneModel.check(loaded);
    require(loaded.variables.equals(result.variables) && loaded.provenance.equals(result.provenance) && loaded.lastActor.equals("synthetic-test"),"Interaction persistence failed");
    JsonObject repeated=action.payload().deepCopy(); repeated.addProperty("revision",3);
    rejects(()->SceneModel.next(result,SceneModel.parse(repeated.toString())));
    // Offsets are bounded structurally, but final bounds are checked against actual source geometry when acting.
    SceneModel.State outside=SceneModel.next(base,SceneModel.parse(CONFIG.replace("[0,0,8]","[0,0,100]")));
    rejects(()->SceneModel.next(outside,action));
    rejects(()->SceneModel.next(base,SceneModel.parse(CONFIG.replace("\"count\":0","\"count\":-1"))));
    rejects(()->SceneModel.next(base,SceneModel.parse(CONFIG.replace("spruce_planks","tnt"))));
    rejects(()->SceneModel.next(base,SceneModel.parse(CONFIG.replace("\"trigger\":\"idea\"","\"trigger\":\"missing\""))));
    SceneModel.State legacy=SceneModel.JSON.fromJson("{\"version\":1,\"revision\":0,\"lastJob\":\"\",\"objects\":{}}",SceneModel.State.class);
    SceneModel.check(legacy);
    require(legacy.rules.isEmpty() && legacy.variables.isEmpty(),"Legacy scene could not upgrade");
    return "PASS: generic conditional actions, once-only replacement, atomic counters/copies/provenance, guide state, bounds/palette guards and legacy persistence";
  }
}
