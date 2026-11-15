package net.mattheard.ironman;

/** Visible default station, with enough slack to inspect a companion by turning. */
final class FollowPosition {
  record Offset(double x,double z) {}
  static Offset ahead(float yaw,double sideAngle) {
    double angle=Math.toRadians(yaw)+sideAngle;
    return new Offset(-Math.sin(angle)*3.5,Math.cos(angle)*3.5);
  }
  static boolean relocate(boolean sameWorld,double distance,boolean blocked) {
    return !sameWorld || distance>5.5 || distance<1.5 || blocked;
  }
  static void check() {
    for(float yaw:new float[]{0,90,180,270}) {
      Offset offset=ahead(yaw,Math.PI/8);double angle=Math.toRadians(yaw);
      double forward=offset.x()*-Math.sin(angle)+offset.z()*Math.cos(angle);
      if(forward<3 || Math.abs(Math.hypot(offset.x(),offset.z())-3.5)>0.00001)throw new AssertionError("Companion station is not ahead and nearby");
    }
    if(relocate(true,3.5,false)||!relocate(true,20,false)||!relocate(false,3.5,false)||!relocate(true,1,false)||!relocate(true,3.5,true))throw new AssertionError("Companion stationary/range guard failed");
  }
}
