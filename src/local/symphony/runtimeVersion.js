import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

let cachedVersions = new Map();
const moduleDirectory = path.dirname(fileURLToPath(import.meta.url));
const fallbackRepoRoot = path.resolve(moduleDirectory, '../../../..');

/**
 * @param {{ repoRoot?: string }} [options]
 * @returns {string} Symphony runtime version from package.json.
 */
export function getSymphonyRuntimeVersion(options = {}) {
  const repoRoot = options.repoRoot ?? process.cwd();
  if (cachedVersions.has(repoRoot)) {
    return cachedVersions.get(repoRoot);
  }

  const packageJson = readPackageJson(repoRoot) ?? readPackageJson(fallbackRepoRoot);
  const version =
    typeof packageJson?.version === 'string' && packageJson.version
      ? packageJson.version
      : 'unknown';
  cachedVersions.set(repoRoot, version);
  return version;
}

function readPackageJson(repoRoot) {
  try {
    const packagePath = path.join(repoRoot, 'package.json');
    return JSON.parse(readFileSync(packagePath, 'utf8'));
  } catch {
    return null;
  }
}
