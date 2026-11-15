package net.mattheard.ironman;

final class BuildPlanCheck {
  static final String PLAN="{\"action\":\"build\",\"speech\":\"Blueprint ready\",\"reason\":\"Owner requested a wall\",\"boxes\":[{\"from\":[0,0,0],\"to\":[2,2,0],\"material\":\"oak_planks\"}]}";
  static void require(boolean value) { if(!value) throw new AssertionError("Blueprint guard failed"); }
  static void rejects(Runnable fn) { try {fn.run();} catch(IllegalArgumentException|IllegalStateException e) {return;} throw new AssertionError("Unsafe blueprint accepted"); }
  public static void main(String[] args) {
    require(BuildPlan.parse(PLAN).blocks().size()==9);
    rejects(()->BuildPlan.parse(PLAN.replace("oak_planks","tnt")));
    rejects(()->BuildPlan.parse(PLAN.replace("oak_planks","chest")));
    rejects(()->BuildPlan.parse(PLAN.replace("[2,2,0]","[16,16,16]")));
    rejects(()->BuildPlan.parse(PLAN.replace("[0,0,0]","[0.1,0,0]")));
    rejects(()->BuildPlan.parse(PLAN.replace("\"build\"","\"follow\"")));
    require(BuildPlan.within(16,0,0,0,0,0,16));require(!BuildPlan.within(16.1,0,0,0,0,0,16));require(!BuildPlan.within(12,12,0,0,0,0,16));
    System.out.println("PASS: blueprint palette, volumes, integers, action constraints and 3D16-block boundary");
  }
}
