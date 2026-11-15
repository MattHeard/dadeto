package org.geysermc.geyser.skin;

import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.*;
import javax.imageio.ImageIO;
import org.geysermc.geyser.entity.type.player.AvatarEntity;
import org.geysermc.mcprotocollib.auth.GameProfile;
import org.junit.jupiter.api.*;
import org.mockito.MockedStatic;
import org.geysermc.geyser.GeyserImpl;
import org.geysermc.geyser.GeyserBootstrap;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/** Exercises the pinned Geyser gate, using the actual bundled production profile. */
class IronManSkinTest {
    private static MockedStatic<GeyserImpl> runtime;
    @BeforeAll static void bootstrap() {
        var instance=mock(GeyserImpl.class);var bootstrap=mock(GeyserBootstrap.class);
        when(bootstrap.getConfigFolder()).thenReturn(Path.of("/tmp/ironman-skin-check"));
        when(instance.getBootstrap()).thenReturn(bootstrap);
        runtime=mockStatic(GeyserImpl.class);runtime.when(GeyserImpl::getInstance).thenReturn(instance);
    }
    @AfterAll static void cleanup() {runtime.close();}

    private AvatarEntity avatar(String profileJson) throws Exception {
        GameProfile profile = new GameProfile(UUID.fromString("daded000-1a01-2000-8000-000000000001"), "IronMan");
        profile.setProperties(List.of(new GameProfile.Property("textures", Base64.getEncoder().encodeToString(profileJson.getBytes(StandardCharsets.UTF_8)))));
        AvatarEntity avatar = mock(AvatarEntity.class);
        when(avatar.getTextures()).thenReturn(profile.getTextures(false));
        return avatar;
    }
    @Test void productionProfileReachesCustomSkinHookInsteadOfFloodgateFallback() throws Exception {
        String source = Files.readString(Path.of("/companion/profile.json"));
        var data = SkinManager.GameProfileData.from(avatar(source));
        assertNotNull(data, "Bootstrap profile was discarded before SessionSkinApplyEvent; custom skin cannot be sent");
        assertTrue(data.skinUrl().startsWith("https://textures.minecraft.net/texture/"));
    }
    @Test void regressionControlShowsOldPlaceholderIsFiltered() throws Exception {
        String sentinel = "{\"textures\":{\"SKIN\":{\"url\":\"https://textures.minecraft.net/texture/31f477eb1a7beee631c2ca64d06f8f68fa93a3386d04452ab27f43acdf1b60cb\"}}}";
        assertNull(SkinManager.GameProfileData.from(avatar(sentinel)));
    }
    @Test void bundledSkinHasAnOpaqueHeadBodyAndBothLimbs() throws Exception {
        var image = ImageIO.read(Path.of("/companion/build/ironman.png").toFile());
        assertEquals(64,image.getWidth());assertEquals(64,image.getHeight());
        for (int[] point : List.of(new int[]{11,11},new int[]{23,24},new int[]{45,24},new int[]{37,56},new int[]{5,24},new int[]{21,56})) {
            assertEquals(255,(image.getRGB(point[0],point[1])>>>24),"Invisible base skin at "+Arrays.toString(point));
        }
    }
}
