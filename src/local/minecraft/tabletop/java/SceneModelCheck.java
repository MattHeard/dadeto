package net.mattheard.tabletop;

/** Runs against the actual protocol parser, without a Minecraft player or world. */
final class SceneModelCheck {
  private static final String VALID = "{\"version\":1,\"id\":\"test-one\",\"action\":\"put\",\"revision\":0,\"object\":{\"id\":\"idea\",\"title\":\"An idea\",\"explanation\":\"A metaphor, not proof\",\"kind\":\"metaphor\",\"boxes\":[{\"from\":[100,64,10],\"to\":[101,64,11],\"material\":\"oak_planks\"}]}}";
  private static void require(boolean value) { if (!value) throw new AssertionError("Scene protocol invariant failed"); }
  private static void rejects(Runnable run) {
    try { run.run(); } catch (IllegalArgumentException | IllegalStateException e) { return; }
    throw new AssertionError("Unsafe input accepted");
  }
  static String run() {
    SceneModel.Request request = SceneModel.parse(VALID);
    require(request.object().blocks().size() == 4);
    SceneModel.State first = SceneModel.next(new SceneModel.State(), request);
    require(first.revision == 1 && first.objects.size() == 1);
    rejects(() -> SceneModel.next(first, request));
    rejects(() -> SceneModel.parse(VALID.replace("100,64,10", "0,64,10")));
    rejects(() -> SceneModel.parse(VALID.replace("101,64,11", "159,95,63")));
    rejects(() -> SceneModel.parse(VALID.replace("oak_planks", "tnt")));
    rejects(() -> SceneModel.parse(VALID.replace("\"metaphor\"", "\"proven-truth\"")));
    rejects(() -> SceneModel.parse(VALID.replace("[100,64,10]", "[100.5,64,10]")));
    rejects(() -> SceneModel.parse(VALID.replace("\"test-one\"", "\"../escape\"")));
    rejects(() -> SceneModel.next(new SceneModel.State(), SceneModel.parse(VALID.replace("\"boxes\":", "\"relatesTo\":[\"missing\"],\"boxes\":"))));
    return "PASS: scene bounds, expansion limit, safe palette, epistemic categories, integer coordinates, IDs and stale revisions";
  }
  public static void main(String[] args) { System.out.println(run()); }
}
