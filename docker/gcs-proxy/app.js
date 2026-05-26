import express from 'express';
import { normalizeObjectPrefix, objectKeyForPath } from './path.js';

/**
 * @param {{
 *   storage: { bucket: (bucketName: string) => { file: (key: string) => {
 *     getMetadata: () => Promise<[Record<string, string>]>,
 *     createReadStream: () => { on: (event: string, handler: (error?: Error) => void) => unknown, pipe: (target: { end: (body?: string) => void }) => unknown }
 *   } } },
 *   bucket: string,
 *   objectPrefix?: string
 * }} options
 * @returns {(req: import('express').Request, res: import('express').Response) => Promise<void>} Handler for a single GCS object request.
 */
export function createObjectProxyHandler({
  storage,
  bucket,
  objectPrefix: rawObjectPrefix,
}) {
  const objectPrefix = normalizeObjectPrefix(rawObjectPrefix);

  return async (req, res) => {
    const key = objectKeyForPath(req.path, objectPrefix);
    const file = storage.bucket(bucket).file(key);

    try {
      const [metadata] = await file.getMetadata();

      if (metadata.contentType) {
        res.set('Content-Type', metadata.contentType);
      }
      if (metadata.cacheControl) {
        res.set('Cache-Control', metadata.cacheControl);
      }

      await new Promise(resolve => {
        file
          .createReadStream()
          .on('error', err => {
            res.status(404).send(err.message);
            resolve();
          })
          .on('end', resolve)
          .pipe(res);
      });
    } catch (error) {
      res.status(404).send(error.message);
    }
  };
}

export function createApp({ storage, bucket, objectPrefix: rawObjectPrefix }) {
  const app = express();
  const handleObjectRequest = createObjectProxyHandler({
    storage,
    bucket,
    objectPrefix: rawObjectPrefix,
  });

  app.get('/*', handleObjectRequest);

  return app;
}
