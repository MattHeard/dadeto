import crypto from 'crypto';
import { Storage } from '@google-cloud/storage';
import * as functions from 'firebase-functions/v1';
import express from 'express';
import cors from 'cors';
import { getAuth } from 'firebase-admin/auth';
import { getAllowedOrigins } from './cors-config.js';
import { ensureFirebaseApp } from './firebaseApp.js';
import { getFirestoreInstance } from './firestore.js';
import { createGenerateStatsCore } from './core.js';
import { fetchFn } from './gcf.js';

const getProcessEnv = () => process.env;

ensureFirebaseApp();
const db = getFirestoreInstance();
const auth = getAuth();
const storage = new Storage();

const env = getProcessEnv();

const generateStatsCore = createGenerateStatsCore({
  db,
  auth,
  storage,
  fetchFn,
  env,
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

const allowedOrigins = getAllowedOrigins(env) ?? [];
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
