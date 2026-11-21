package net.mattheard.tabletop;

import com.destroystokyo.paper.profile.ProfileProperty;
import io.papermc.paper.datacomponent.item.ResolvableProfile;
import java.awt.Color;
import java.awt.image.BufferedImage;
import java.util.*;
import net.kyori.adventure.text.Component;
import org.bukkit.*;
import org.bukkit.entity.Mannequin;
import org.bukkit.event.*;
import org.bukkit.event.player.PlayerInteractEntityEvent;
import org.bukkit.inventory.EquipmentSlot;
import org.geysermc.geyser.api.GeyserApi;
import org.geysermc.geyser.api.event.EventRegistrar;
import org.geysermc.geyser.api.event.bedrock.SessionSkinApplyEvent;
import org.geysermc.geyser.api.skin.*;

final class Household implements Listener, EventRegistrar {
  private record Role(String name, String title, String line, int x, int z, int fabric, int complexion, int hair) {}
  private static final List<Role> ROLES = List.of(
    new Role("Aveline", "Steward", "Welcome. Please state your business before entering the study.", 6, 95, 0x343563, 0xa66d4f, 0x322524),
    new Role("Bram", "Cook", "Dinner is at sundown. If you're early, you can help with the onions.", 29, 117, 0x763e29, 0xe8b78b, 0x593a27),
    new Role("Mira", "House Guard", "Guests may enter. Leave any quarrels on this side of the door.", -1, 98, 0x435b50, 0x794c39, 0x211d1e));
  private record Person(Mannequin entity, Skin skin, Role role) {}
  private final Map<UUID, Person> people = new java.util.concurrent.ConcurrentHashMap<>();
  private boolean subscribed;

  void spawn(TabletopPlugin plugin, World world) {
    Bukkit.getPluginManager().registerEvents(this, plugin);
    if (Bukkit.getPluginManager().isPluginEnabled("Geyser-Spigot")) {
      GeyserApi.api().eventBus().subscribe(this, SessionSkinApplyEvent.class, event -> {
        Person person = people.get(event.uuid());
        if (person != null) {
          event.skin(person.skin());
          event.geometry(SkinGeometry.WIDE);
        }
      });
      subscribed = true;
    }
    for (Role role : ROLES) {
      Skin skin = new Skin("dadeto-house-" + role.name(), texture(role));
      world.spawn(new Location(world, role.x()+.5, 65, role.z()+.5), Mannequin.class, entity -> {
        entity.setPersistent(false);
        entity.setInvulnerable(true);
        entity.setImmovable(true);
        entity.setCollidable(false);
        entity.customName(Component.text(role.name() + " • " + role.title()));
        entity.setCustomNameVisible(true);
        var profile = Bukkit.createProfile(entity.getUniqueId(), role.name());
        profile.setProperty(new ProfileProperty("textures", Base64.getEncoder().encodeToString(
          "{\"textures\":{\"SKIN\":{\"url\":\"https://textures.minecraft.net/texture/d5c4ee5ce20aed9e33e866c66caa37178606234b3721084bf01d13320fb2eb3f\"}}}".getBytes(java.nio.charset.StandardCharsets.UTF_8))));
        entity.setProfile(ResolvableProfile.resolvableProfile(profile));
        people.put(entity.getUniqueId(), new Person(entity, skin, role));
      });
    }
  }

  int count() { return (int) people.values().stream().filter(p -> p.entity().isValid()).count(); }

  void close() {
    if (subscribed) GeyserApi.api().eventBus().unregisterAll(this);
    people.values().forEach(p -> p.entity().remove());
    people.clear();
  }

  @EventHandler public void onUse(PlayerInteractEntityEvent event) {
    Person person = people.get(event.getRightClicked().getUniqueId());
    if (person == null || event.getHand() != EquipmentSlot.HAND) return;
    event.setCancelled(true);
    event.getPlayer().sendMessage(person.role().name() + ": " + person.role().line());
  }

  private static byte[] texture(Role role) {
    BufferedImage image = new BufferedImage(64, 64, BufferedImage.TYPE_INT_ARGB);
    var g = image.createGraphics();
    g.setColor(new Color(role.fabric()));
    g.fillRect(0, 16, 56, 16);
    g.fillRect(16, 48, 32, 16);
    g.setColor(new Color(role.hair()));
    g.fillRect(0, 8, 32, 8);
    g.fillRect(8, 0, 16, 8);
    g.setColor(new Color(role.complexion()));
    g.fillRect(9, 10, 6, 6);
    g.fillRect(40, 29, 16, 3);
    g.fillRect(32, 61, 16, 3);
    g.setColor(Color.WHITE);
    g.fillRect(9, 11, 2, 1);
    g.fillRect(13, 11, 2, 1);
    g.setColor(new Color(0x30281f));
    g.fillRect(10, 11, 1, 1);
    g.fillRect(13, 11, 1, 1);
    g.fillRect(11, 14, 2, 1);
    g.setColor(role.title().equals("Cook") ? new Color(0xe7dfc8) : new Color(0xc8a364));
    g.fillRect(22, 20, 4, role.title().equals("Cook") ? 12 : 4);
    g.fillRect(20, 27, 8, 1);
    g.dispose();
    byte[] rgba = new byte[64 * 64 * 4];
    int i = 0;
    for (int y = 0; y < 64; y++) for (int x = 0; x < 64; x++) {
      int pixel = image.getRGB(x, y);
      rgba[i++] = (byte) (pixel >> 16);
      rgba[i++] = (byte) (pixel >> 8);
      rgba[i++] = (byte) pixel;
      rgba[i++] = (byte) (pixel >> 24);
    }
    return rgba;
  }
}
