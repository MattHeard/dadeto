/** @typedef {import('../../../../types/allow-effects').AllowEffects} AllowEffects */
/**
 * @template {Uint8Array} Bytes
 * @typedef {{bucketDir: string, filePath: string, absolutePath: string, save: (content: string | Uint8Array, options?: object) => Promise<void>, exists: () => Promise<boolean[]>, download: () => Promise<Bytes[]>}} StorageFile
 */
/**
 * @template {Uint8Array} Bytes
 * @typedef {{rootDir: string, name: string, bucketDir: string, file: (path: string) => StorageFile<Bytes>}} StorageBucket
 */
/**
 * @template {Uint8Array} Bytes
 * @typedef {{rootDir: string, bucket: (name: string) => StorageBucket<Bytes>}} StorageClient
 */

/**
 * Bind a storage-compatible class to explicit platform capabilities.
 * @template {Uint8Array} Bytes
 * @param {{
 *   fileSystem: {
 *     mkdir: (permission: AllowEffects, path: string, options: {recursive: boolean}) => Promise<unknown>,
 *     writeFile: (permission: AllowEffects, path: string, content: Bytes) => Promise<void>,
 *     stat: (path: string) => Promise<unknown>,
 *     readFile: (path: string) => Promise<Bytes>,
 *   },
 *   paths: {join: (...parts: string[]) => string, dirname: (path: string) => string},
 *   toBytes: (content: string | Uint8Array) => Bytes,
 *   bindEffectBoundary: import('../../../../types/allow-effects').AllowEffectsBoundary,
 * }} dependencies Platform readers, permission-first writes and byte conversion.
 * @returns {new (options: {rootDir: string}) => StorageClient<Bytes>} Bound storage constructor.
 */
export function createFakeStorageClass(dependencies) {
  class FakeStorage {
    /** @param {{rootDir: string}} options Storage root options. */
    constructor({ rootDir }) {
      this.rootDir = rootDir;
    }

    /**
     * @param {string} name Bucket name.
     * @returns {StorageBucket<Bytes>} Bucket handle.
     */
    bucket(name) {
      return new FakeBucket(this.rootDir, name);
    }
  }

  class FakeBucket {
    /**
     * @param {string} rootDir Storage root directory.
     * @param {string} name Bucket name.
     */
    constructor(rootDir, name) {
      this.rootDir = rootDir;
      this.name = name;
      this.bucketDir = dependencies.paths.join(rootDir, name);
    }

    /**
     * @param {string} filePath Path within the bucket.
     * @returns {StorageFile<Bytes>} File handle.
     */
    file(filePath) {
      return new FakeFile(this.bucketDir, filePath);
    }
  }

  class FakeFile {
    /**
     * @param {string} bucketDir Bucket directory.
     * @param {string} filePath Path within the bucket.
     */
    constructor(bucketDir, filePath) {
      this.bucketDir = bucketDir;
      this.filePath = filePath;
      this.absolutePath = dependencies.paths.join(bucketDir, filePath);
    }

    /**
     * Enter one bound SDK save invocation and forward its permission to writes.
     * @param {string | Uint8Array} content File contents.
     * @returns {Promise<void>} Save completion.
     */
    async save(content) {
      return dependencies.bindEffectBoundary(async permission => {
        await dependencies.fileSystem.mkdir(
          permission,
          dependencies.paths.dirname(this.absolutePath),
          { recursive: true }
        );
        await dependencies.fileSystem.writeFile(
          permission,
          this.absolutePath,
          dependencies.toBytes(content)
        );
      });
    }

    /** @returns {Promise<boolean[]>} Storage-compatible existence result. */
    async exists() {
      try {
        await dependencies.fileSystem.stat(this.absolutePath);
        return [true];
      } catch {
        return [false];
      }
    }

    /** @returns {Promise<Bytes[]>} Storage-compatible download result. */
    async download() {
      return [await dependencies.fileSystem.readFile(this.absolutePath)];
    }
  }

  return FakeStorage;
}
