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
  for (const e of entries) {
    const abs = path.join(dir, e.name);
    const rel = path.relative(srcDir, abs);
    const dst = path.posix.join(destPrefix, rel);
    if (e.isDirectory()) {
      await uploadDir(abs, destPrefix + '/' + e.name);
    } else {
      const start = Date.now();
      tlog('upload:file:start', { abs, dst });
      await storage.bucket(bucketName).upload(abs, { destination: dst });
      tlog('upload:file:end', { abs, ms: Date.now() - start });
    }
  }
}
uploadDir(srcDir, `${prefix}/${runId}`)
  .then(() => tlog('uploadDir:done', { gs: `gs://${bucketName}/${prefix}/${runId}` }))
  .catch((err) => {
    tlog('uploadDir:error', { message: err?.message, code: err?.code });
    process.exit(1);
  });
