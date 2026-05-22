import express from 'express';
import { normalizeObjectPrefix, objectKeyForPath } from './path.js';

export function createApp({ storage, bucket, objectPrefix: rawObjectPrefix }) {
  const app = express();
  const objectPrefix = normalizeObjectPrefix(rawObjectPrefix);

  app.get('/*', (req, res) => {
    const key = objectKeyForPath(req.path, objectPrefix);
    const file = storage.bucket(bucket).file(key);

    file
      .getMetadata()
      .then(([metadata]) => {
        if (metadata.contentType) {
          res.set('Content-Type', metadata.contentType);
        }
        if (metadata.cacheControl) {
          res.set('Cache-Control', metadata.cacheControl);
        }

        file
          .createReadStream()
          .on('error', err => res.status(404).send(err.message))
          .pipe(res);
      })
      .catch(err => res.status(404).send(err.message));
  });

  return app;
}
