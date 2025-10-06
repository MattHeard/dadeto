// minimal recursive upload using ADC
const { Storage } = require('@google-cloud/storage');
const fs = require('fs');
const path = require('path');

const bucketName = process.env.REPORT_BUCKET;
const prefix = process.env.REPORT_PREFIX || 'run';
const runId = new Date().toISOString().replace(/[:.]/g, '-');
const srcDir = path.resolve('playwright-report');

if (!bucketName) throw new Error('REPORT_BUCKET not set');

const storage = new Storage();
async function uploadDir(dir, destPrefix) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const abs = path.join(dir, e.name);
    const rel = path.relative(srcDir, abs);
    const dst = path.posix.join(destPrefix, rel);
    if (e.isDirectory()) await uploadDir(abs, destPrefix + '/' + e.name);
    else await storage.bucket(bucketName).upload(abs, { destination: dst });
  }
}
uploadDir(srcDir, `${prefix}/${runId}`)
  .then(() => console.log(`Uploaded report to gs://${bucketName}/${prefix}/${runId}`))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
