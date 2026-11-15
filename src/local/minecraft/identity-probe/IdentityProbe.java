package net.mattheard.minecraft;

import org.bukkit.event.EventHandler;
import org.bukkit.event.EventPriority;
import org.bukkit.event.Listener;
import org.bukkit.event.player.AsyncPlayerPreLoginEvent;
import org.bukkit.plugin.java.JavaPlugin;

/** Logs authenticated profile identifiers before allowlist admission. */
public final class IdentityProbe extends JavaPlugin implements Listener {
  @Override
  public void onEnable() {
    getServer().getPluginManager().registerEvents(this, this);
  }

  @EventHandler(priority = EventPriority.MONITOR)
  public void onPreLogin(AsyncPlayerPreLoginEvent event) {
    getLogger().info("Profile " + event.getName() + " UUID " + event.getUniqueId()
        + " result " + event.getLoginResult());
  }
}
