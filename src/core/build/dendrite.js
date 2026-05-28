/**
 * Copy the browser and core trees into infra for deployment.
 * @param {{
 *   console: { log: (message: string) => void },
 *   fs: {
 *     existsSync: (path: string) => boolean,
 *     mkdirSync: (path: string, options: { recursive: boolean }) => void,
 *     readdirSync: (path: string, options: { withFileTypes: boolean }) => Array<{ name: string, isDirectory: () => boolean }>,
 *     copyFileSync: (source: string, destination: string) => void,
 *   },
 *   path: {
 *     resolve: (...parts: string[]) => string,
 *     dirname: (path: string) => string,
 *     join: (...parts: string[]) => string,
 *   },
 *   fileURLToPath: (url: string) => string,
 *   importMetaUrl: string,
 * }} deps Deployment dependencies.
 */
export function executeCopyDendriteWorkflow({
  console,
  fs,
  path,
  fileURLToPath,
  importMetaUrl,
}) {
  const root = path.resolve(
    path.dirname(fileURLToPath(importMetaUrl)),
    '../../'
  );
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
      const srcPath = path.join(source, entry.name);
      const destPath = path.join(destination, entry.name);
      if (entry.isDirectory()) {
        copyTree(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }

  console.log('Copying files for dendritestories.co.nz deployment...');
  copyTree(
    path.join(root, 'src', 'browser'),
    path.join(root, 'infra', 'browser')
  );
  copyTree(path.join(root, 'src', 'core'), path.join(root, 'infra', 'core'));
  console.log('✓ Copied browser files to infra/browser');
  console.log('✓ Copied core files to infra/core');
  console.log('Ready for Terraform deployment to GCS');
}
