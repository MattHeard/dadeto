package net.mattheard.ironman;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Objects;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicBoolean;
import org.geysermc.geyser.api.GeyserApi;
import org.geysermc.geyser.api.entity.custom.CustomEntityDefinition;
import org.geysermc.geyser.api.event.java.ServerSpawnEntityEvent;
import org.geysermc.geyser.api.event.lifecycle.GeyserDefineEntitiesEvent;
import org.geysermc.geyser.api.event.lifecycle.GeyserDefineResourcePacksEvent;
import org.geysermc.geyser.api.pack.PackCodec;
import org.geysermc.geyser.api.pack.ResourcePack;

/** Maps only the current Survival companion to its Bedrock visual. */
final class SurvivalSuit {
  private volatile UUID companion;

  SurvivalSuit(IronManPlugin plugin) throws IOException {
    Path path = plugin.getDataFolder().toPath().resolve("survival-suit.mcpack");
    try (var resource = Objects.requireNonNull(plugin.getResource("survival-suit.mcpack"))) {
      Files.copy(resource, path, StandardCopyOption.REPLACE_EXISTING);
    }

    var definition = CustomEntityDefinition.of("dadeto:survival_iron_man");
    var pack = ResourcePack.create(PackCodec.path(path));
    var packRegistered = new AtomicBoolean();
    var events = GeyserApi.api().eventBus();
    events.subscribe(plugin, GeyserDefineEntitiesEvent.class, event -> {
      event.register(definition);
      plugin.getLogger().info("Survival Iron Man Bedrock player model registered");
    });
    events.subscribe(plugin, GeyserDefineResourcePacksEvent.class, event -> {
      packRegistered.set(false);
      event.register(pack);
      packRegistered.set(true);
      plugin.getLogger().info("Survival Iron Man Bedrock suit pack registered");
    });
    events.subscribe(plugin, ServerSpawnEntityEvent.class, event -> {
      if (event.uuid().equals(companion) && packRegistered.get() && definition.registered()) {
        event.definition(definition);
      }
    });
  }

  void track(UUID uuid) {
    companion = uuid;
  }
}
