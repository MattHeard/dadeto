import express from 'express';
import { Storage } from '@google-cloud/storage';
import { normalizeObjectPrefix, objectKeyForPath } from './path.js';

const app = express();
const storage = new Storage();
const bucket = process.env.BUCKET;
const objectPrefix = normalizeObjectPrefix(process.env.OBJECT_PREFIX);

app.get('/*', (req, res) => {
  const key = objectKeyForPath(req.path, objectPrefix);
  storage
    .bucket(bucket)
    .file(key)
    .createReadStream()
    .on('error', err => res.status(404).send(err.message))
    .pipe(res);
});

app.listen(8080, () => console.log('gcs-proxy listening on 8080'));
