import { createNotionCodexLauncherCore } from '../../core/local/notion-codex/launcher.js';

export function createNotionCodexLauncher(options) {
  const handle = createNotionCodexLauncherCore(options);
  return handle;
}
