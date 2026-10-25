import {
  appendExperimentDesignV1,
  exportInterpretabilityResearchBundleV7,
  importInterpretabilityResearchBundleV2,
} from '../../interpretability/interpretability.js';

/** @typedef {import('../../../../types/allow-effects').AllowEffects} AllowEffects */

/**
 * Create a cross-process atomic local adapter for portable Atlas bundle writes.
 * @param {{bundle: {bundlePath: string, schemas: any}, fileSystem: {pathModule: {resolve: (...parts: string[]) => string, dirname: (path: string) => string}, readFileImpl: Function, mkdirImpl: Function, writeFileImpl: Function, renameImpl: Function, rmImpl: Function}, lock: {lockTimeoutMs?: number, retryDelayMs?: number, sleepImpl: (delayMs: number) => Promise<void>, nowImpl: () => number}, identity: {randomIdImpl: () => string, digestImpl: (json: string) => string}}} dependencies Bundle metadata and injected filesystem, lock, and identity operations.
 * @returns {{loadBundle: (allowEffects: AllowEffects) => Promise<string>, saveBundle: (allowEffects: AllowEffects, json: string) => Promise<void>, submitExperimentDesign: (allowEffects: AllowEffects, design: Record<string, any>) => Promise<Record<string, any>>}} Permission-aware atomic storage.
 */
export function createAtlasResearchStorageCore({
  bundle,
  fileSystem,
  lock,
  identity,
}) {
  const { bundlePath, schemas } = bundle;
  const {
    pathModule,
    readFileImpl,
    mkdirImpl,
    writeFileImpl,
    renameImpl,
    rmImpl,
  } = fileSystem;
  const { lockTimeoutMs = 5000, retryDelayMs = 25, sleepImpl, nowImpl } = lock;
  const { randomIdImpl, digestImpl } = identity;
  const resolvedPath = pathModule.resolve(bundlePath);
  const lockPath = `${resolvedPath}.lock`;
  const loadedDigests = new WeakMap();

  /** @returns {Promise<string>} Current serialized bundle. */
  async function readCurrent() {
    return readFileImpl(resolvedPath, 'utf8');
  }

  /** @param {string} json Serialized bundle to replace atomically. */
  async function writeAtomically(json) {
    const tempPath = `${resolvedPath}.${randomIdImpl()}.tmp`;
    try {
      await writeFileImpl(tempPath, json, {
        encoding: 'utf8',
        flag: 'wx',
        mode: 0o600,
      });
      await renameImpl(tempPath, resolvedPath);
    } finally {
      await rmImpl(tempPath, { force: true });
    }
  }

  /**
   * @template T
   * @param {() => Promise<T>} operation Work protected by the bundle lock.
   * @returns {Promise<T>} Operation result.
   */
  async function withLock(operation) {
    await mkdirImpl(pathModule.dirname(resolvedPath), {
      mode: 0o700,
      recursive: true,
    });
    const startedAt = nowImpl();
    while (true) {
      try {
        await mkdirImpl(lockPath, { mode: 0o700 });
        break;
      } catch (error) {
        if (error?.code !== 'EEXIST') throw error;
        if (nowImpl() - startedAt >= lockTimeoutMs) {
          throw storageError('bundle-storage-lock-timeout');
        }
        await sleepImpl(retryDelayMs);
      }
    }
    try {
      return await operation();
    } finally {
      await rmImpl(lockPath, { recursive: true, force: true });
    }
  }

  return Object.freeze({
    loadBundle: async allowEffects => {
      const json = await readCurrent();
      loadedDigests.set(allowEffects, digestImpl(json));
      return json;
    },
    saveBundle: async (allowEffects, json) => {
      const expectedDigest = loadedDigests.get(allowEffects);
      if (!expectedDigest) throw storageError('bundle-read-required');
      await withLock(async () => {
        const current = await readCurrent();
        if (digestImpl(current) !== expectedDigest) {
          throw storageError('bundle-write-conflict');
        }
        const imported = importInterpretabilityResearchBundleV2(json, schemas);
        if (!imported.valid) throw storageError('invalid-research-bundle');
        await writeAtomically(json);
        loadedDigests.delete(allowEffects);
      });
    },
    submitExperimentDesign: async (allowEffects, design) => {
      void allowEffects;
      return withLock(async () => {
        const current = await readCurrent();
        const imported = importInterpretabilityResearchBundleV2(
          current,
          schemas
        );
        if (!imported.valid) return imported;
        const appended = appendExperimentDesignV1(
          imported.bundle,
          design,
          schemas
        );
        if (!appended.valid) return appended;
        const exported = exportInterpretabilityResearchBundleV7(
          appended.bundle,
          schemas
        );
        if (exported.valid) await writeAtomically(exported.json);
        return exported;
      });
    },
  });
}

/**
 * Create a stable machine-readable storage error.
 * @param {string} code Error code.
 * @returns {Error & {code: string}} Storage failure.
 */
function storageError(code) {
  return Object.assign(new Error(code), { code });
}
