import { createNotionCodexLauncherCore } from '../../core/local/notion-codex/launcher.js';

const handle = createNotionCodexLauncherFactory();

export { handle };
export { handle as createNotionCodexLauncher };

function createNotionCodexLauncherFactory() {
  return options => createNotionCodexLauncherCore(options);
}
