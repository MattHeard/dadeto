// CFv2 HTTP. Streams from GCS using runtime SA. No public access.
import { Storage } from '@google-cloud/storage';

const storage = new Storage();
const BUCKET = process.env.BUCKET;
const INDEX = process.env.WEBSITE_INDEX || 'index.html';
const NOT_FOUND = process.env.WEBSITE_404 || '404.html';

export const gcsProxy = async (req, res) => {
  try {
    const rawPath = decodeURIComponent((req.path || '/').replace(/^\/+/, ''));
    const path = rawPath === '' ? INDEX : rawPath;
    const file = storage.bucket(BUCKET).file(path);

    const [exists] = await file.exists();
    if (!exists) {
      const nf = storage.bucket(BUCKET).file(NOT_FOUND);
      const [nfExists] = await nf.exists();
      res.status(nfExists ? 404 : 404);
      (nfExists ? nf : file).createReadStream()
        .on('error', () => res.end())
        .pipe(res);
      return;
    }

    const [meta] = await file.getMetadata();
    if (meta.contentType) res.setHeader('Content-Type', meta.contentType);
    file.createReadStream()
      .on('error', () => {
        res.status(500).end();
      })
      .pipe(res);
  } catch {
    res.status(500).end();
  }
};
