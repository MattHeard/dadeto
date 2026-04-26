import express from 'express';
import { Storage } from '@google-cloud/storage';

const app = express();
const storage = new Storage();
const bucket = process.env.BUCKET;
const objectPrefix = normalizeObjectPrefix(process.env.OBJECT_PREFIX);

function normalizeObjectPrefix(value) {
  if (typeof value !== 'string') {
    return '';
  }

  const trimmed = value.replace(/^\/+|\/+$/g, '');
  return trimmed ? `${trimmed}/` : '';
}

function objectKeyForPath(path) {
  const key = path.replace(/^\/+/, '') || 'index.html';
  return `${objectPrefix}${key}`;
}

app.get('/*', (req, res) => {
  const key = objectKeyForPath(req.path);
  storage
    .bucket(bucket)
    .file(key)
    .createReadStream()
    .on('error', err => res.status(404).send(err.message))
    .pipe(res);
});

app.listen(8080, () => console.log('gcs-proxy listening on 8080'));
