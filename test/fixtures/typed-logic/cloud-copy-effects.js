import { createHash } from 'node:crypto';
import path from 'node:path';

/**
 * Observe complete copy and import-rewrite behavior with deterministic ports.
 * @param {Function} copyCloud Actual builder under evaluation.
 * @param {string} payload Input module contents for every rewrite candidate.
 * @returns {Promise<object>} Ordered effects and stable content hashes.
 */
export async function observeCloudCopyEffects(copyCloud, payload) {
  const copies = [];
  const directories = [];
  const reads = [];
  const writes = [];
  const rewrites = [];
  await copyCloud({
    fileURLToPathFn: () => '/reference/src/core/build/copy-cloud.js',
    dirnameFn: path.posix.dirname,
    pathModule: path.posix,
    fsPromisesModule: {
      readdir: async directory => {
        directories.push(directory);
        return [
          { name: 'witness.js', isDirectory: () => false, isFile: () => true },
        ];
      },
      mkdir: async () => undefined,
      copyFile: async (source, target) => {
        copies.push([source, target]);
      },
      readFile: async (file, encoding) => {
        reads.push([file, encoding]);
        return payload;
      },
      writeFile: async (file, content) => {
        writes.push([file, createHash('sha256').update(content).digest('hex')]);
      },
    },
    logger: {
      info: message => {
        if (message.startsWith('Rewrote')) rewrites.push(message);
      },
    },
  });
  return { copies, directories, reads, writes, rewrites };
}

/**
 * Retain exact ordered-effect evidence without duplicating large deployment tables.
 * @param {Record<string, unknown[]>} effects Captured complete effect lists.
 * @returns {Record<string, {count: number, sha256: string}>} Lossless comparison digests and counts.
 */
export function summarizeCloudCopyEffects(effects) {
  return Object.fromEntries(
    Object.entries(effects).map(([name, values]) => [
      name,
      {
        count: values.length,
        sha256: createHash('sha256')
          .update(JSON.stringify(values))
          .digest('hex'),
      },
    ])
  );
}
