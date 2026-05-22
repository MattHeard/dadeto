import { Storage } from '@google-cloud/storage';
import { createApp } from './app.js';

const storage = new Storage();
const bucket = process.env.BUCKET;
const objectPrefix = process.env.OBJECT_PREFIX;
const app = createApp({ storage, bucket, objectPrefix });

app.listen(8080, () => console.log('gcs-proxy listening on 8080'));
