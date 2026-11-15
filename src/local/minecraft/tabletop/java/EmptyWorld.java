package net.mattheard.tabletop;

import org.bukkit.generator.ChunkGenerator;

/** Dedicated empty backdrop; the authored board is the only terrain. */
public final class EmptyWorld extends ChunkGenerator {
  @Override public boolean shouldGenerateNoise() { return false; }
  @Override public boolean shouldGenerateSurface() { return false; }
  @Override public boolean shouldGenerateBedrock() { return false; }
  @Override public boolean shouldGenerateCaves() { return false; }
  @Override public boolean shouldGenerateDecorations() { return false; }
  @Override public boolean shouldGenerateMobs() { return false; }
  @Override public boolean shouldGenerateStructures() { return false; }
}
