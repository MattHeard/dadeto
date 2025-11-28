// minimal recursive upload using ADC
const { Storage } = require('@google-cloud/storage');
const fs = require('fs');
const path = require('path');

const bucketName = process.env.REPORT_BUCKET;
const prefix = process.env.REPORT_PREFIX || 'run';
const tlog = (...args) => console.log(new Date().toISOString(), ...args);
const runId = new Date().toISOString().replace(/[:.]/g, '-');
const srcDir = path.resolve('playwright-report');

if (!bucketName) throw new Error('REPORT_BUCKET not set');
tlog('config', { bucketName, prefix, srcDir });

const storage = new Storage();
/**
 * Recursively upload the report directory to Cloud Storage.
 * @param {string} dir Absolute path to the source directory.
 * @param {string} destPrefix Destination prefix used when writing to the bucket.
 * @returns {Promise<void>} Promise that resolves when the directory upload completes.
 */
async function uploadDir(dir, destPrefix) {
  tlog('uploadDir:start', { dir, destPrefix });
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    await uploadEntry(entry, dir, destPrefix);
  }
}

/**
 * Upload a single entry from the source directory.
 * @param {import('fs').Dirent} entry Directory entry being processed.
 * @param {string} dir Absolute path of the entry's parent directory.
 * @param {string} destPrefix Destination prefix for blob writes.
 * @returns {Promise<void>}
 */
async function uploadEntry(entry, dir, destPrefix) {
  const abs = path.join(dir, entry.name);
  const rel = path.relative(srcDir, abs);
  const dst = path.posix.join(destPrefix, rel);

  if (entry.isDirectory()) {
    await uploadDir(abs, `${destPrefix}/${entry.name}`);
    return;
  }

  const start = Date.now();
  tlog('upload:file:start', { abs, dst });
  await storage.bucket(bucketName).upload(abs, { destination: dst });
  tlog('upload:file:end', { abs, ms: Date.now() - start });
}

uploadDir(srcDir, `${prefix}/${runId}`)
  .then(handleUploadSuccess)
  .catch(handleUploadError);

/**
 * Log that the upload run completed successfully.
 */
function handleUploadSuccess() {
  tlog('uploadDir:done', { gs: `gs://${bucketName}/${prefix}/${runId}` });
}

/**
 * Log a fatal error encountered during upload and exit.
 * @param {Error | null | undefined} err Error that caused the failure.
 */
function handleUploadError(err) {
  tlog('uploadDir:error', getUploadErrorDetails(err));
  process.exit(1);
}

/**
 * Build the log payload for an upload failure.
 * @param {Error | null | undefined} err Raw error raised during upload.
 * @returns {{message?: string, code?: unknown}} Details to emit for the failure.
 */
function getUploadErrorDetails(err) {
  if (!err) {
    return {};
  }

  return {
    message: err.message,
    code: err.code,
  };
}
