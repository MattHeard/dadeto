/** @typedef {{ existsSync: (path: string) => boolean, mkdirSync: (path: string, options: { recursive: boolean }) => void, readdirSync: (path: string, options: { withFileTypes: boolean }) => Array<{ name: string, isDirectory: () => boolean }>, copyFileSync: (source: string, destination: string) => void }} DendriteFileSystem */
/** @typedef {{ resolve: (...parts: string[]) => string, dirname: (path: string) => string, join: (...parts: string[]) => string }} DendritePath */
/** @typedef {{ console: { log: (message: string) => void }, fs: DendriteFileSystem, path: DendritePath, fileURLToPath: (url: string) => string, importMetaUrl: string }} DendriteDependencies */
/**
 * Prepare a recursive copier for injected filesystem and path APIs.
 * @param {DendriteFileSystem} fs Filesystem operations used by the copy workflow.
 * @param {DendritePath} path Path operations used to resolve source and destination names.
 * @returns {(source: string, destination: string) => void} Recursive tree copier.
 */
const createTreeCopier = (fs, path) => {
  /**
   * Copy a directory tree recursively.
   * @param {string} source Source directory.
   * @param {string} destination Destination directory.
   * @returns {void}
   */
  function copyTree(source, destination) {
    if (!fs.existsSync(source)) return;
    fs.mkdirSync(destination, { recursive: true });
    for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
      copyTreeEntry(entry, source, destination);
    }
  }

  /**
   * Dispatch one filesystem entry while preserving depth-first copy order.
   * @param {{ name: string, isDirectory: () => boolean }} entry Filesystem entry.
   * @param {string} source Source parent directory.
   * @param {string} destination Destination parent directory.
   * @returns {void}
   */
  function copyTreeEntry(entry, source, destination) {
    const srcPath = path.join(source, entry.name);
    const destPath = path.join(destination, entry.name);
    if (entry.isDirectory()) {
      copyTree(srcPath, destPath);
      return;
    }
    fs.copyFileSync(srcPath, destPath);
  }

  return copyTree;
};

/**
 * Prepare the root resolver for this deployment entrypoint.
 * @param {DendritePath} path Path operations used to resolve the project root.
 * @param {(url: string) => string} fileURLToPath URL path adapter.
 * @returns {(importMetaUrl: string) => string} Project-root resolver.
 */
const createDeploymentRootResolver = (path, fileURLToPath) => importMetaUrl =>
  path.resolve(path.dirname(fileURLToPath(importMetaUrl)), '../../');

/**
 * Copy the browser and core trees into infra for deployment.
 * @param {DendriteDependencies} deps Deployment dependencies.
 */
export function executeCopyDendriteWorkflow(deps) {
  const root = createDeploymentRootResolver(
    deps.path,
    deps.fileURLToPath
  )(deps.importMetaUrl);
  const copyTree = createTreeCopier(deps.fs, deps.path);

  deps.console.log('Copying files for dendritestories.co.nz deployment...');
  copyTree(
    deps.path.join(root, 'src', 'browser'),
    deps.path.join(root, 'infra', 'browser')
  );
  copyTree(
    deps.path.join(root, 'src', 'core'),
    deps.path.join(root, 'infra', 'core')
  );
  deps.console.log('✓ Copied browser files to infra/browser');
  deps.console.log('✓ Copied core files to infra/core');
  deps.console.log('Ready for Terraform deployment to GCS');
}
