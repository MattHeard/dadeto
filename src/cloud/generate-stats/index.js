import crypto from 'crypto';
import { Storage } from '@google-cloud/storage';
import * as functions from 'firebase-functions/v1';
import express from 'express';
import cors from 'cors';
import { getAuth } from 'firebase-admin/auth';
import { ADMIN_UID } from './admin-config.js';
import corsConfig from './cors-config.js';
import { ensureFirebaseApp } from './firebaseApp.js';
import { getFirestoreInstance } from './firestore.js';
import { createFirebaseResources, createGenerateStatsCore } from './core.js';

const PROJECT = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT;
const URL_MAP = process.env.URL_MAP || 'prod-dendrite-url-map';
const CDN_HOST = process.env.CDN_HOST || 'www.dendritestories.co.nz';
const BUCKET = 'www.dendritestories.co.nz';
const fetchFn =
  typeof globalThis.fetch === 'function'
    ? globalThis.fetch.bind(globalThis)
    : undefined;

const firebaseResources = createFirebaseResources({
  ensureFirebaseApp,
  getFirestoreInstance,
  getAuth,
  StorageCtor: Storage,
});

const { db, auth, storage } = firebaseResources;

const generateStatsCore = createGenerateStatsCore({
  db,
  auth,
  storage,
  fetchFn,
  project: PROJECT,
  urlMap: URL_MAP,
  cdnHost: CDN_HOST,
  bucket: BUCKET,
  adminUid: ADMIN_UID,
  cryptoModule: crypto,
});

const {
  getStoryCount,
  getPageCount,
  getUnmoderatedPageCount,
  getTopStories,
  generate,
  handleRequest,
} = generateStatsCore;

const { allowedOrigins = [] } = corsConfig;
const app = express();

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.includes(origin)) {
        cb(null, true);
      } else {
        cb(new Error('CORS'));
      }
    },
    methods: ['POST'],
  })
);

app.post('/', handleRequest);

export const generateStats = functions
  .region('europe-west1')
  .https.onRequest(app);

export {
  getStoryCount,
  getPageCount,
  getUnmoderatedPageCount,
  getTopStories,
  generate,
  handleRequest,
};
