package net.mattheard.ironman;

import java.util.Set;
import java.util.UUID;
import net.kyori.adventure.text.Component;
import org.bukkit.*;
import org.bukkit.entity.*;
import org.bukkit.event.*;
import org.bukkit.event.entity.*;
import org.bukkit.event.player.PlayerInteractEntityEvent;
import org.bukkit.inventory.ItemStack;
import org.bukkit.inventory.meta.LeatherArmorMeta;
import org.bukkit.util.Vector;

/** The hub companion uses native mob movement and damage, with bounded suit actions. */
final class SurvivalCompanion implements Listener {
  private static final Set<Material> FOOD = Set.of(Material.BREAD, Material.COOKED_BEEF,
      Material.COOKED_CHICKEN, Material.BAKED_POTATO, Material.CARROT);
  private final IronManPlugin plugin;
  private final UUID owner;
  private final SurvivalSuit suit;
  private Villager mob;
  private boolean summoned;
  private int food, provisions, charge, seconds;
  private double health;
  private long nextAbility;

  SurvivalCompanion(IronManPlugin plugin, UUID owner, SurvivalSuit suit) {
    this.plugin = plugin;
    this.owner = owner;
    this.suit = suit;
    var config = plugin.getConfig();
    food = Math.clamp(config.getInt("survival-state.food",20),0,20);
    provisions = Math.clamp(config.getInt("survival-state.provisions",0),0,64);
    charge = Math.clamp(config.getInt("survival-state.charge",100),0,100);
    health = Math.clamp(config.getDouble("survival-state.health",20),0,20);
    Bukkit.getPluginManager().registerEvents(this,plugin);
    Bukkit.getScheduler().runTaskTimer(plugin,this::tick,20,20);
    plugin.getLogger().info("Survival Iron Man villager enabled in the overworld");
  }

  static boolean inHub(Player player) {
    return player != null && player.getGameMode() == GameMode.SURVIVAL
        && player.getWorld().getKey().equals(NamespacedKey.minecraft("overworld"));
  }

  void command(Player player, String action) {
    if (!player.getUniqueId().equals(owner) || !inHub(player)) {
      player.sendMessage("Use this as Iron Man’s assigned partner in the survival hub.");
      return;
    }
    switch (action) {
      case "summon" -> {
        if (health <= 0) { player.sendMessage("Iron Man has fallen. Use /ironman respawn."); return; }
        summoned = true;
        if (mob == null) spawn(player);
        player.sendMessage(mob == null ? "Find clear ground and try again." : "Iron Man is here.");
      }
      case "respawn" -> {
        if (health > 0) { player.sendMessage("Iron Man is still alive."); return; }
        health = 20; food = 20; charge = 0; provisions = 0;
        save(); summoned = true; spawn(player);
        player.sendMessage(mob == null ? "Use /ironman summon on clear ground." : "Iron Man has respawned.");
      }
      case "dismiss" -> close();
      case "feed" -> feed(player);
      case "boost", "repulse" -> ability(player,action);
      default -> player.sendMessage("Iron Man · health " + (int)(mob == null ? health : mob.getHealth())
          + "/20 · food " + food + "/20 · provisions " + provisions + " · charge " + charge + "/100");
    }
  }

  private void spawn(Player player) {
    var feet = player.getLocation().getBlock();
    for (var face : java.util.List.of(org.bukkit.block.BlockFace.NORTH,org.bukkit.block.BlockFace.SOUTH,
        org.bukkit.block.BlockFace.EAST,org.bukkit.block.BlockFace.WEST)) {
      var base = feet.getRelative(face);
      if (!base.isPassable() || base.isLiquid() || !base.getRelative(0,1,0).isPassable()
          || !base.getRelative(0,-1,0).getType().isSolid()) continue;
      mob = player.getWorld().spawn(base.getLocation().add(.5,0,.5),Villager.class, entity -> {
        entity.setProfession(Villager.Profession.ARMORER);
        entity.customName(Component.text("Iron Man"));
        entity.setCustomNameVisible(true);
        entity.setPersistent(false);
        entity.setRemoveWhenFarAway(false);
        entity.setCanPickupItems(false);
        entity.getEquipment().setHelmet(armor(Material.LEATHER_HELMET,Color.YELLOW));
        entity.getEquipment().setChestplate(armor(Material.LEATHER_CHESTPLATE,Color.RED));
        entity.getEquipment().setLeggings(armor(Material.LEATHER_LEGGINGS,Color.RED));
        entity.getEquipment().setBoots(armor(Material.LEATHER_BOOTS,Color.YELLOW));
        for (var slot : org.bukkit.inventory.EquipmentSlot.values()) {
          if (slot == org.bukkit.inventory.EquipmentSlot.HEAD || slot == org.bukkit.inventory.EquipmentSlot.CHEST
              || slot == org.bukkit.inventory.EquipmentSlot.LEGS || slot == org.bukkit.inventory.EquipmentSlot.FEET)
            entity.getEquipment().setDropChance(slot,0);
        }
        entity.setHealth(health);
        // The spawn consumer runs before Paper sends the entity to Geyser.
        if (suit != null) suit.track(entity.getUniqueId());
      });
      return;
    }
  }

  private ItemStack armor(Material type, Color color) {
    var item = new ItemStack(type);
    var meta = (LeatherArmorMeta)item.getItemMeta();
    meta.setColor(color);
    item.setItemMeta(meta);
    return item;
  }

  private void tick() {
    Player player = Bukkit.getPlayer(owner);
    if (!summoned || !inHub(player) || player.isDead()) { close(); return; }
    if (mob == null) return;
    if (!mob.isValid() || !mob.getWorld().equals(player.getWorld())) { close(); return; }
    double distance = mob.getLocation().distanceSquared(player.getLocation());
    if (distance > 256) { close(); return; }
    if (distance > 9 && food > 0) mob.getPathfinder().moveTo(player,1.05);
    else mob.getPathfinder().stopPathfinding();
    seconds++;
    if (seconds % 30 == 0 && distance > 9 && food > 0) food--;
    if (food <= 16 && provisions > 0) { provisions--; food = Math.min(20,food+4); }
    if (seconds % 5 == 0) {
      if (food == 0) mob.damage(1);
      else if (food >= 18 && mob.getHealth() < 20) { mob.setHealth(Math.min(20,mob.getHealth()+1)); food--; }
      if (mob != null && food >= 6 && mob.isOnGround() && charge < 100) charge++;
      save();
    }
  }

  private void feed(Player player) {
    var item = player.getInventory().getItemInMainHand();
    if (!near(player) || !FOOD.contains(item.getType()) || provisions >= 64) {
      player.sendMessage("Stand near Iron Man holding bread, cooked beef or chicken, a baked potato, or a carrot.");
      return;
    }
    item.setAmount(item.getAmount()-1);
    provisions++;
    save();
    player.sendMessage("Iron Man took one food item for his provisions.");
  }

  private boolean near(Player player) {
    return mob != null && mob.isValid() && mob.getWorld().equals(player.getWorld())
        && mob.getLocation().distanceSquared(player.getLocation()) <= 36;
  }

  private void ability(Player player, String action) {
    int cost = action.equals("boost") ? 15 : 20;
    if (!near(player) || charge < cost || food < 6 || System.currentTimeMillis() < nextAbility) {
      player.sendMessage("Iron Man needs to be nearby, fed, charged and off cooldown.");
      return;
    }
    if (action.equals("boost")) {
      if (!mob.isOnGround()) return;
      mob.getPathfinder().stopPathfinding();
      mob.setVelocity(player.getLocation().getDirection().setY(0).multiply(.65).setY(.65));
      mob.getWorld().spawnParticle(Particle.SMALL_FLAME,mob.getLocation(),8);
    } else if (!repulse(player)) {
      return;
    }
    charge -= cost;
    food--;
    nextAbility = System.currentTimeMillis()+4000;
    save();
  }

  private boolean repulse(Player player) {
    if (!(player.getTargetEntity(8) instanceof Monster enemy)
        || enemy.getLocation().distanceSquared(mob.getLocation()) > 36
        || !mob.hasLineOfSight(enemy)) {
      player.sendMessage("Aim at a nearby hostile mob in Iron Man’s line of sight.");
      return false;
    }

    var world = mob.getWorld();
    var body = mob.getLocation();
    var impact = enemy.getBoundingBox().getCenter();
    Vector force = enemy.getLocation().toVector().subtract(body.toVector());
    var facing = body.clone().setDirection(impact.clone().subtract(mob.getEyeLocation().toVector()));
    double yaw = Math.toRadians(facing.getYaw());
    var palm = body.clone().add(-Math.cos(yaw) * .23, 1.05, -Math.sin(yaw) * .23);
    Vector beam = impact.clone().subtract(palm.toVector());
    double length = beam.length();
    if (length > 0 && world.rayTraceBlocks(palm, beam, length, FluidCollisionMode.NEVER, true) != null) {
      player.sendMessage("Iron Man’s shot is blocked.");
      return false;
    }

    mob.setRotation(facing.getYaw(), facing.getPitch());
    world.spawnParticle(Particle.ELECTRIC_SPARK, palm, 8, .08, .08, .08, .03);
    world.playSound(palm, Sound.ENTITY_BLAZE_SHOOT, SoundCategory.NEUTRAL, .65f, 1.7f);
    int steps = Math.max(1, (int)Math.ceil(length / .2));
    for (int step = 0; step < steps; step++) {
      var point = palm.clone().add(beam.clone().multiply((double)step / steps));
      world.spawnParticle(Particle.END_ROD, point, 1, 0, 0, 0, 0);
    }

    var hit = impact.toLocation(world);
    world.spawnParticle(Particle.ELECTRIC_SPARK, hit, 12, .15, .15, .15, .12);
    world.playSound(hit, Sound.BLOCK_AMETHYST_BLOCK_HIT, SoundCategory.NEUTRAL, .75f, 1.3f);
    enemy.damage(4, mob);
    if (force.lengthSquared() > .01) enemy.setVelocity(force.normalize().multiply(.8).setY(.25));
    return true;
  }

  private void save() {
    if (mob != null && !mob.isDead()) health = mob.getHealth();
    var config = plugin.getConfig();
    config.set("survival-state.health",health);
    config.set("survival-state.food",food);
    config.set("survival-state.provisions",provisions);
    config.set("survival-state.charge",charge);
    plugin.saveConfig();
  }

  void close() {
    summoned = false;
    if (mob == null) return;
    save();
    mob.remove();
    mob = null;
    if (suit != null) suit.track(null);
  }

  @EventHandler public void trade(PlayerInteractEntityEvent event) {
    if (event.getRightClicked().equals(mob)) event.setCancelled(true);
  }

  @EventHandler public void target(EntityTargetEvent event) {
    if (event.getEntity().equals(mob)) event.setCancelled(true);
  }

  @EventHandler public void transform(EntityTransformEvent event) {
    if (event.getEntity().equals(mob)) event.setCancelled(true);
  }

  @EventHandler public void death(EntityDeathEvent event) {
    if (!event.getEntity().equals(mob)) return;
    event.getDrops().clear();
    event.setDroppedExp(0);
    health = 0;
    summoned = false;
    mob = null;
    if (suit != null) suit.track(null);
    save();
  }
}
