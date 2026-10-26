/** @typedef {import('../../../../types/allow-effects').AllowEffects} AllowEffects */
/** @typedef {{ok: boolean, status: number}} UploadResponse */
/** @typedef {{method: 'POST', headers: Record<string, string>, body: Uint8Array<ArrayBuffer>}} UploadRequest */
/** @typedef {(permission: AllowEffects, url: string, init: UploadRequest) => Promise<UploadResponse>} UploadFetch */
/** @typedef {(permission: AllowEffects) => string|Promise<string>} UploadCredentials */
/** @typedef {{statFn: (permission: AllowEffects, path: string) => {isDirectory: () => boolean}|Promise<{isDirectory: () => boolean}>, readDirFn: (permission: AllowEffects, path: string) => string[]|Promise<string[]>, readFileFn: (permission: AllowEffects, path: string) => Uint8Array<ArrayBuffer>|Promise<Uint8Array<ArrayBuffer>>}} ArtifactFiles */

/**
 * Create new report objects without remote reads, listings, or deletion.
 * Every upload is conditional on the object not already existing.
 * @param {{fileSystem: ArtifactFiles, pathModule: {join: (...parts: string[]) => string, basename: (path: string) => string}, getAccessTokenFn: UploadCredentials, fetchFn: UploadFetch}} dependencies Permission-aware filesystem, credentials, and HTTP seams.
 * @returns {(permission: AllowEffects, options: {bucketName: string, prefix: string, paths: string[]}) => Promise<number>} Uploads every selected artifact and returns the file count.
 */
export function createPlaywrightArtifactUploader({
  fileSystem,
  pathModule,
  getAccessTokenFn,
  fetchFn,
}) {
  return async (permission, { bucketName, prefix, paths }) => {
    const objectPrefix = normalizeTarget(bucketName, prefix);
    if (!paths.length) throw new Error('No report artifacts were selected.');
    const token = await readUploadToken(permission, getAccessTokenFn);
    const writeObject = createObjectWriter(
      permission,
      fetchFn,
      bucketName,
      token
    );
    let uploaded = 0;
    for (const localPath of paths) {
      const before = uploaded;
      await visit(
        localPath,
        `${objectPrefix}/${pathModule.basename(localPath)}`
      );
      if (uploaded === before)
        throw new Error(`Cloud report artifact is empty: ${localPath}`);
    }
    return uploaded;

    /**
     * @param {string} localPath Source file or directory.
     * @param {string} objectName Exact destination object name.
     * @returns {Promise<void>} Uploads a file or recursively visits a directory.
     */
    async function visit(localPath, objectName) {
      const stat = await fileSystem.statFn(permission, localPath);
      if (stat.isDirectory()) {
        for (const name of await fileSystem.readDirFn(permission, localPath))
          await visit(
            pathModule.join(localPath, name),
            `${objectName}/${name}`
          );
        return;
      }
      const body = await fileSystem.readFileFn(permission, localPath);
      await writeObject(objectName, body);
      uploaded += 1;
    }
  };
}

/**
 * @param {string} bucketName Destination bucket.
 * @param {string} prefix Unique per-run prefix.
 * @returns {string} Normalized nonempty prefix.
 */
function normalizeTarget(bucketName, prefix) {
  const normalized = prefix.trim().replace(/^\/+|\/+$/g, '');
  if (!bucketName.trim() || !normalized)
    throw new Error(
      'Report upload requires a bucket and a unique nonempty prefix.'
    );
  return normalized;
}

/**
 * @param {AllowEffects} permission Invocation permission.
 * @param {UploadCredentials} getAccessTokenFn Runtime credential seam.
 * @returns {Promise<string>} Short-lived token kept out of errors and logs.
 */
async function readUploadToken(permission, getAccessTokenFn) {
  try {
    const token = (await getAccessTokenFn(permission)).trim();
    if (!token) throw new Error('Empty token.');
    return token;
  } catch {
    throw new Error('Could not obtain report upload credentials.');
  }
}

/**
 * Bind one invocation's credentials and transport to per-file object creation.
 * @param {AllowEffects} permission Invocation permission.
 * @param {UploadFetch} fetchFn Permission-aware HTTP seam.
 * @param {string} bucketName Destination bucket.
 * @param {string} token Short-lived invocation credential.
 * @returns {(objectName: string, body: Uint8Array<ArrayBuffer>) => Promise<void>} Writes a new object or rejects without exposing credentials.
 */
function createObjectWriter(permission, fetchFn, bucketName, token) {
  return async (objectName, body) => {
    const url = `https://storage.googleapis.com/upload/storage/v1/b/${encodeURIComponent(bucketName)}/o?uploadType=media&name=${encodeURIComponent(objectName)}&ifGenerationMatch=0`;
    let response;
    try {
      response = await fetchFn(permission, url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': contentType(objectName),
        },
        body,
      });
    } catch {
      throw new Error(`Cloud report transport failed: ${objectName}`);
    }
    if (!response.ok)
      throw new Error(
        `Cloud report upload failed (HTTP ${response.status}): ${objectName}`
      );
  };
}

/**
 * @param {string} objectName Destination file name.
 * @returns {string} MIME type for report rendering or download.
 */
function contentType(objectName) {
  const types = /** @type {Record<string, string>} */ ({
    html: 'text/html; charset=utf-8',
    json: 'application/json',
    png: 'image/png',
    svg: 'image/svg+xml',
    webm: 'video/webm',
    zip: 'application/zip',
    txt: 'text/plain; charset=utf-8',
    log: 'text/plain; charset=utf-8',
  });
  return (
    types[objectName.slice(objectName.lastIndexOf('.') + 1)] ??
    'application/octet-stream'
  );
}
