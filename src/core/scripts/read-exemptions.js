/**
 * Read a repo-relative exemption baseline from disk.
 * @param {{
 *   readFileSync: (filePath: string, encoding: 'utf8') => string,
 *   rootDir: string,
 *   configPath: string,
 *   pathModule: {
 *     resolve: (...segments: string[]) => string,
 *   },
 * }} deps Exemption-file dependencies.
 * @returns {Set<string>} Repo-relative file paths to suppress.
 */
export function readExemptions(deps) {
  try {
    const raw = deps.readFileSync(
      deps.pathModule.resolve(deps.rootDir, deps.configPath),
      'utf8'
    );
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return new Set();
    }

    const exemptions = parsed.exemptions || {};
    return new Set(Object.keys(exemptions));
  } catch {
    return new Set();
  }
}
